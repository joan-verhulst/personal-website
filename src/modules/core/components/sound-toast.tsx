"use client";

import { gsap } from "gsap";
import { VolumeOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FIRST_PLAY_EVENT,
  setSoundEnabled,
} from "~/modules/core/hooks/use-haptic-sound";
import { track } from "~/utils/eyes";

const DISMISS_AFTER_MS = 10_000;

const SoundToast = () => {
  const [visible, setVisible] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const animateOut = () => {
    if (!toastRef.current) {
      setVisible(false);
      return;
    }
    gsap.to(toastRef.current, {
      y: 12,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setVisible(false),
    });
  };

  useEffect(() => {
    if (visible) animateOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleFirstPlay = () => {
      setVisible(true);
      timerRef.current = setTimeout(animateOut, DISMISS_AFTER_MS);
    };

    window.addEventListener(FIRST_PLAY_EVENT, handleFirstPlay);
    return () => {
      window.removeEventListener(FIRST_PLAY_EVENT, handleFirstPlay);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible || !toastRef.current) return;
    gsap.fromTo(
      toastRef.current,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.7)" },
    );
  }, [visible]);

  const handleDisable = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSoundEnabled(false);
    track("Setting Changed", {
      setting: "sound",
      enabled: false,
      from: "toast",
    });
    animateOut();
  };

  if (!visible) return null;

  return (
    <div
      ref={toastRef}
      className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-neutral-950/10 bg-neutral-50 px-3.5 py-2.5 opacity-0"
    >
      <span className="whitespace-nowrap text-neutral-950/50 text-xs">
        Sound effects on
      </span>
      <button
        onClick={handleDisable}
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-neutral-950 px-2.5 py-1 text-neutral-50 text-xs transition-colors hover:bg-neutral-800"
      >
        <VolumeOff className="h-3 w-3" />
        Disable
      </button>
    </div>
  );
};

export default SoundToast;
