"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import {
  Settings2,
  Volume2,
  VolumeOff,
  Sparkles,
  SparklesIcon,
} from "lucide-react";
import {
  isSoundEnabled,
  setSoundEnabled,
  PREFERENCE_EVENT,
} from "~/modules/core/hooks/use-haptic-sound";
import {
  useAnimationPreference,
  ANIMATION_PREFERENCE_EVENT,
} from "~/modules/core/context/animation-preference-context";
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
    track("Setting Changed", { setting: "sound", enabled: muted });
  };

  const handleAnimationsToggle = () => {
    setAnimationsEnabled(!animationsEnabled);
    track("Setting Changed", {
      setting: "animations",
      enabled: !animationsEnabled,
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center h-10 rounded-full border border-neutral-950/10 bg-neutral-50 overflow-hidden pointer-events-auto"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary-500 text-neutral-50 cursor-pointer transition-opacity whitespace-nowrap"
          >
            {animationsEnabled ? (
              <>
                Disable animations
                <Sparkles className="w-3 h-3" />
              </>
            ) : (
              <>
                Enable animations
                <Sparkles className="w-3 h-3" />
              </>
            )}
          </button>

          {/* Sound toggle */}
          <button
            onClick={handleSoundToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary-500 text-neutral-50 cursor-pointer transition-opacity whitespace-nowrap"
          >
            {muted ? (
              <>
                Enable sound
                <Volume2 className="w-3 h-3" />
              </>
            ) : (
              <>
                Disable sound
                <VolumeOff className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings icon */}
      <button
        onClick={handleFabClick}
        className="w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer text-neutral-950/40 hover:text-neutral-950 transition-colors"
        aria-label="Settings"
      >
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SettingsFab;
