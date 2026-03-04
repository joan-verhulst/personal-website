"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import cn from "~utils/cn";

type WidgetCardProps = {
  label: string;
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  children?: React.ReactNode;
};

const WidgetCard = ({
  label,
  src,
  alt = "",
  className = "",
  imgClassName = "object-cover",
  children,
}: WidgetCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const wiggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wiggleAnimationRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseEnter = () => {
      gsap.to(card, {
        scale: 0.9,
        duration: 0.4,
        ease: "back.out(1.7)",
      });

      // Start wiggle after 1 second of hovering
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
      // Clear the timeout if mouse leaves before 1 second
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

    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
      if (wiggleTimeoutRef.current) {
        clearTimeout(wiggleTimeoutRef.current);
      }
      if (wiggleAnimationRef.current) {
        wiggleAnimationRef.current.kill();
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative w-full aspect-square rounded-4xl border border-neutral-950/10 select-none cursor-pointer",
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
