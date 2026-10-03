"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import cn from "~utils/cn";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

type WidgetCardProps = {
  label: string;
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

const WidgetCard = ({
  label,
  src,
  alt = "",
  className = "",
  imgClassName = "object-cover",
  children,
  onClick,
}: WidgetCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const wiggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const haptic = useHapticSound();
  const wiggleAnimationRef = useRef<gsap.core.Tween | null>(null);
  const { animationsEnabled } = useAnimationPreference();

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseEnter = () => {
      if (!animationsEnabled) return;

      gsap.to(card, {
        scale: 0.9,
        duration: 0.4,
        ease: "back.out(1.7)",
      });

      // Start wiggle after 400ms of hovering
      wiggleTimeoutRef.current = setTimeout(() => {
        wiggleAnimationRef.current = gsap.to(card, {
          rotation: 2,
          duration: 0.15,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
          repeatDelay: 0,
        });
      }, 400);
    };

    const handleMouseLeave = () => {
      if (!animationsEnabled) return;

      // Clear the timeout if mouse leaves before 400ms
      if (wiggleTimeoutRef.current) {
        clearTimeout(wiggleTimeoutRef.current);
        wiggleTimeoutRef.current = null;
      }

      // Kill the wiggle animation if it's running
      if (wiggleAnimationRef.current) {
        wiggleAnimationRef.current.kill();
        wiggleAnimationRef.current = null;
      }

      // Reset scale and rotation
      gsap.to(card, {
        scale: 1,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(1.7)",
      });
    };

    const handleMouseEnterWithSound = () => {
      handleMouseEnter();
      haptic.onMouseEnter();
    };
    const handleMouseLeaveWithSound = () => {
      handleMouseLeave();
      haptic.onMouseLeave();
    };

    card.addEventListener("mouseenter", handleMouseEnterWithSound);
    card.addEventListener("mouseleave", handleMouseLeaveWithSound);

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnterWithSound);
      card.removeEventListener("mouseleave", handleMouseLeaveWithSound);
      if (wiggleTimeoutRef.current) {
        clearTimeout(wiggleTimeoutRef.current);
      }
      if (wiggleAnimationRef.current) {
        wiggleAnimationRef.current.kill();
      }
    };
  }, [animationsEnabled]);

  return (
    <div
      ref={cardRef}
      // The part of a section link that the section opens out of
      data-tile
      onClick={() => {
        haptic.onClick();
        onClick?.();
      }}
      className={cn(
        // inset-border sits over the image, so it reaches the rounded edge
        "relative w-full aspect-square rounded-4xl inset-border select-none cursor-pointer",
        !animationsEnabled &&
          "hover:scale-90 transition-transform duration-300",
        className,
      )}
    >
      {src && !children && (
        <div className="relative w-full h-full overflow-hidden rounded-4xl">
          <Image
            src={src}
            alt={alt}
            fill
            className={cn(imgClassName, "pointer-events-none rounded-4xl")}
          />
        </div>
      )}
      {children}
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs">
        {label}
      </span>
    </div>
  );
};

export default WidgetCard;
