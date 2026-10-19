"use client";

import { gsap } from "gsap";
import {
  Settings2,
  Sparkles,
  SparklesIcon,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANIMATION_PREFERENCE_EVENT,
  useAnimationPreference,
} from "~/modules/core/context/animation-preference-context";
import {
  isSoundEnabled,
  PREFERENCE_EVENT,
  setSoundEnabled,
} from "~/modules/core/hooks/use-haptic-sound";
import { track } from "~/utils/eyes";

const SettingsFab = () => {
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const { animationsEnabled, setAnimationsEnabled } = useAnimationPreference();
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync muted state with localStorage and preference change events
  useEffect(() => {
    setMuted(!isSoundEnabled());

    const handlePreference = (e: Event) => {
      setMuted(!(e as CustomEvent<boolean>).detail);
    };

    window.addEventListener(PREFERENCE_EVENT, handlePreference);
    return () => window.removeEventListener(PREFERENCE_EVENT, handlePreference);
  }, []);

  const collapse = useCallback(() => {
    if (!contentRef.current) return;
    gsap.to(contentRef.current, {
      width: 0,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setExpanded(false),
    });
  }, []);

  // Collapse on click outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        collapse();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, collapse]);

  const handleFabClick = () => {
    if (expanded) {
      collapse();
      return;
    }

    setExpanded(true);

    // Measure the natural width, then animate from 0
    if (!contentRef.current) return;
    gsap.set(contentRef.current, { width: "auto", opacity: 1 });
    const fullWidth = contentRef.current.offsetWidth;
    gsap.set(contentRef.current, { width: 0, opacity: 0 });
    gsap.to(contentRef.current, {
      width: fullWidth,
      opacity: 1,
      duration: 0.35,
      ease: "back.out(1.7)",
    });
  };

  const handleSoundToggle = () => {
    setSoundEnabled(muted);
    track("Setting Changed", {
      setting: "sound",
      enabled: muted,
      from: "settings",
    });
  };

  const handleAnimationsToggle = () => {
    setAnimationsEnabled(!animationsEnabled);
    track("Setting Changed", {
      setting: "animations",
      enabled: !animationsEnabled,
      from: "settings",
    });
  };

  return (
    // Fades out while the footer is open, see data-footer in use-curtain.ts
    <div
      ref={containerRef}
      className="pointer-events-auto in-data-[footer=open]:invisible flex h-10 items-center overflow-hidden rounded-full border border-neutral-950/10 bg-neutral-50 in-data-[footer=open]:opacity-0 transition-[opacity,visibility] duration-300"
    >
      {/* Expandable settings panel */}
      <div
        ref={contentRef}
        className="flex items-center overflow-hidden"
        style={{ width: 0, opacity: 0 }}
      >
        <div className="flex items-center gap-2 pl-2">
          {/* Animation toggle */}
          <button
            onClick={handleAnimationsToggle}
            className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-primary-500 px-2.5 py-1 text-neutral-50 text-xs transition-colors hover:bg-primary-600"
          >
            {animationsEnabled ? (
              <>
                Disable animations
                <Sparkles className="h-3 w-3" />
              </>
            ) : (
              <>
                Enable animations
                <Sparkles className="h-3 w-3" />
              </>
            )}
          </button>

          {/* Sound toggle */}
          <button
            onClick={handleSoundToggle}
            className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-primary-500 px-2.5 py-1 text-neutral-50 text-xs transition-colors hover:bg-primary-600"
          >
            {muted ? (
              <>
                Enable sound
                <Volume2 className="h-3 w-3" />
              </>
            ) : (
              <>
                Disable sound
                <VolumeOff className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings icon */}
      <button
        onClick={handleFabClick}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-neutral-950/40 transition-colors hover:text-neutral-950"
        aria-label="Settings"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SettingsFab;
