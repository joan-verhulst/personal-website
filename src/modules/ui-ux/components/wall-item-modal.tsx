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
        <AnimatedText ref={titleTextRef} trigger="manual">
          {item.title}
        </AnimatedText>
      }
      onOpenComplete={handleOpenComplete}
    >
      {/* Who it was for and what it is, read as one block */}
      <div className="flex max-w-2xl flex-col gap-1">
        {item.tag && (
          <WallTag
            tag={item.tag}
            className="h-auto self-start px-0 text-lg text-neutral-950 leading-tight"
          />
        )}
        {item.description && (
          <AnimatedText
            ref={descriptionTextRef}
            as="p"
            className="font-light text-base text-neutral-950/66 leading-snug"
            trigger="manual"
          >
            {item.description}
          </AnimatedText>
        )}
      </div>

      {/* Media, with the link to the live site over its bottom right corner */}
      <div
        ref={mediaRef}
        className="relative inset-border mt-6 w-full overflow-hidden rounded-xl"
        style={{
          opacity: 0,
          aspectRatio: item.media.width / item.media.height,
        }}
      >
        <WallMedia item={item} sizes="(min-width: 896px) 848px, 100vw" />
        {item.link && (
          <a
            href={item.link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={haptic.onClick}
            onMouseEnter={haptic.onMouseEnter}
            className="absolute right-3 bottom-3 z-10 flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-neutral-50 text-sm shadow-[0_4px_12px_-4px_rgb(0_0_0/0.35)] transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          >
            {item.link.label}
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>
    </Modal>
  );
};

export default WallItemModal;
