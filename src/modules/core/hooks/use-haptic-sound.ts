"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

const STORAGE_KEY = "haptic-sound-enabled";
const TOAST_SHOWN_KEY = "haptic-toast-shown";
export const PREFERENCE_EVENT = "haptic-sound-preference-change";
export const FIRST_PLAY_EVENT = "haptic-first-play";

// Module-level flag — fires the toast event only once per session
let firstPlayDispatched = false;

// Haptic pattern for click on touch devices
const CLICK_PATTERN = [
  { duration: 80, intensity: 0.8 },
  { delay: 80, duration: 50, intensity: 0.3 },
];

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Returns true if sounds/haptics are enabled. Unset = enabled by default. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(STORAGE_KEY);
  return val !== "false";
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: enabled }));
}

/** Returns true if the user has explicitly set a preference. */
export function hasSoundPreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

function dispatchFirstPlay(): void {
  if (firstPlayDispatched) return;
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TOAST_SHOWN_KEY) === "true") return;
  firstPlayDispatched = true;
  localStorage.setItem(TOAST_SHOWN_KEY, "true");
  window.dispatchEvent(new CustomEvent(FIRST_PLAY_EVENT));
}

interface AudioNodes {
  ctx: AudioContext;
  filter: BiquadFilterNode;
  gain: GainNode;
  buffer: AudioBuffer;
}

function buildAudioGraph(): AudioNodes {
  const ctx = new AudioContext();

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 4000;
  filter.Q.value = 8;

  const gain = ctx.createGain();
  filter.connect(gain);
  gain.connect(ctx.destination);

  const duration = 0.004;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 25);
  }

  return { ctx, filter, gain, buffer };
}

function playClick(nodes: AudioNodes, intensity: number): void {
  const { ctx, filter, gain, buffer } = nodes;

  // Refresh buffer noise each click (mirrors web-haptics exactly)
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 25);
  }

  gain.gain.value = 0.5 * intensity;

  const baseFreq = 2000 + intensity * 2000;
  const jitter = 1 + (Math.random() - 0.5) * 0.3;
  filter.frequency.value = baseFreq * jitter;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(filter);
  source.onended = () => source.disconnect();
  source.start();
}

interface HapticSoundHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

export function useHapticSound(): HapticSoundHandlers {
  const { trigger } = useWebHaptics();
  const nodesRef = useRef<AudioNodes | null>(null);
  const touchDevice = useRef<boolean>(false);

  useEffect(() => {
    touchDevice.current = isTouchDevice();
    if (touchDevice.current) return;

    // Build graph eagerly so it's ready when needed
    nodesRef.current = buildAudioGraph();

    // Pre-warm: resume context on the first pointer interaction anywhere on the
    // page. Browsers require a click/pointerdown (not mouseenter) to allow audio.
    const prewarm = () => {
      if (nodesRef.current?.ctx.state === "suspended") {
        nodesRef.current.ctx.resume();
      }
      document.removeEventListener("pointerdown", prewarm);
    };
    document.addEventListener("pointerdown", prewarm);

    return () => {
      document.removeEventListener("pointerdown", prewarm);
    };
  }, []);

  // Get or create audio graph synchronously — must stay within user gesture context
  const ensureAudio = useCallback((): AudioNodes | null => {
    if (touchDevice.current) return null;

    if (!nodesRef.current) {
      nodesRef.current = buildAudioGraph();
    }

    if (nodesRef.current.ctx.state === "suspended") {
      nodesRef.current.ctx.resume();
    }

    return nodesRef.current;
  }, []);

  const onMouseEnter = useCallback(() => {
    if (touchDevice.current) return;
    if (!isSoundEnabled()) return;
    const nodes = ensureAudio();
    if (nodes && nodes.ctx.state === "running") {
      playClick(nodes, 0.5);
      dispatchFirstPlay();
    }
  }, [ensureAudio]);

  const onMouseLeave = useCallback(() => {
    // no-op — kept for symmetry if callers need it
  }, []);

  const onClick = useCallback(() => {
    if (!isSoundEnabled()) return;
    if (touchDevice.current) {
      trigger(CLICK_PATTERN);
      dispatchFirstPlay();
      return;
    }
    const nodes = ensureAudio();
    if (nodes) {
      // context may have just been resumed by this click — play regardless
      playClick(nodes, 0.8);
      dispatchFirstPlay();
    }
  }, [ensureAudio, trigger]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      nodesRef.current?.ctx.close();
      nodesRef.current = null;
    };
  }, []);

  return { onMouseEnter, onMouseLeave, onClick };
}
