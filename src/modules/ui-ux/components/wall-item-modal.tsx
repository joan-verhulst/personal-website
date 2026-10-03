"use client";

import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useRef } from "react";
import type { WallItem } from "~/modules/content/types";
import Modal from "~/modules/core/components/modal";
import AnimatedText, {
  type AnimatedTextHandle,
} from "~/modules/core/components/utils/AnimatedText";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import WallTag from "~/modules/ui-ux/components/wall-tag";

interface Props {
  item: WallItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const WallItemModal = ({ item, isOpen, onClose }: Props) => {
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<AnimatedTextHandle>(null);
  const descriptionTextRef = useRef<AnimatedTextHandle>(null);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  const handleOpenComplete = useCallback(() => {
    titleTextRef.current?.triggerAnimation();
    setTimeout(() => descriptionTextRef.current?.triggerAnimation(), 50);

    if (!mediaRef.current) return;

    if (!animationsEnabled) {
      gsap.set(mediaRef.current, { opacity: 1 });
    } else {
      gsap.fromTo(
        mediaRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.inOut" },
      );
    }
  }, [animationsEnabled]);

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <WallTag
          tag={item.tag}
          className="text-neutral-50"
          style={{ backgroundColor: item.tag.color }}
        />
      }
      onOpenComplete={handleOpenComplete}
    >
      {/* Title and link */}
      <div className="mb-2 flex items-center justify-between gap-4">
        <AnimatedText
          ref={titleTextRef}
          as="h2"
          className="font-regular text-lg text-neutral-950"
          trigger="manual"
        >
          {item.title}
        </AnimatedText>
        {item.link && (
          <a
            href={item.link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={haptic.onClick}
            onMouseEnter={haptic.onMouseEnter}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-neutral-50 text-sm transition-colors duration-200 hover:bg-primary-500/75"
          >
            {item.link.label}
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <AnimatedText
          ref={descriptionTextRef}
          as="p"
          className="max-w-2xl font-light text-base text-neutral-950/66"
          trigger="manual"
        >
          {item.description}
        </AnimatedText>
      )}

      {/* Media */}
      <div
        ref={mediaRef}
        className="relative inset-border mt-8 w-full overflow-hidden rounded-xl"
        style={{
          opacity: 0,
          aspectRatio: item.media.width / item.media.height,
        }}
      >
        <WallMedia item={item} sizes="(min-width: 896px) 848px, 100vw" />
      </div>
    </Modal>
  );
};

export default WallItemModal;
