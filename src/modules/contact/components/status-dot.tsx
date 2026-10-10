"use client";

import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

/**
 * The green light for taking on work, colored like the contact widget. It
 * pings while animations are on.
 */
const StatusDot = ({ className }: { className?: string }) => {
  const { animationsEnabled } = useAnimationPreference();

  return (
    <span aria-hidden className={cn("relative flex size-2", className)}>
      {animationsEnabled && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[#2FC72F] opacity-75 motion-reduce:hidden" />
      )}
      <span className="relative size-2 rounded-full bg-[#2FC72F]" />
    </span>
  );
};

export default StatusDot;
