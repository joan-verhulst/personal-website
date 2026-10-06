"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { WallItem } from "~/modules/content/types";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

interface Props {
  item: WallItem;
  sizes: string;
  className?: string;
}

const WallMedia = ({ item, sizes, className }: Props) => {
  const style = {
    // Screenshots are anchored top left in their card, reels stay centered
    objectPosition: item.position ?? (item.bare ? "center" : "left top"),
    transform: item.zoom ? `scale(${item.zoom})` : undefined,
  };

  if (item.media.type === "video") {
    return (
      <AutoplayVideo src={item.media.src} className={className} style={style} />
    );
  }

  return (
    <Image
      src={item.media.src}
      unoptimized
      alt={item.title}
      fill
      sizes={sizes}
      quality={90}
      className={cn("object-cover", className)}
      style={style}
      draggable={false}
    />
  );
};

interface AutoplayVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

// Plays only while on screen; stays on its first frame when animations are off
const AutoplayVideo = ({ src, className, style }: AutoplayVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { animationsEnabled } = useAnimationPreference();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (
      !animationsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);

    return () => observer.disconnect();
  }, [animationsEnabled]);

  return (
    <video
      ref={videoRef}
      // #t makes Safari render a first frame without a poster
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      style={style}
    />
  );
};

export default WallMedia;
