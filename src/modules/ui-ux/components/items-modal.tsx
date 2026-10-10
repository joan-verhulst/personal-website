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
import WallTag, { TagLogo } from "~/modules/ui-ux/components/wall-tag";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";

// Padding scales with the card width, the card being an inline-size container
const PADDING_X = "px-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_LEFT = "pl-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_TOP = "pt-[clamp(1.25rem,6cqw,3rem)]";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  // A line over the list, saying what's in it
  intro: string;
  items: WallItem[];
  // Names each card by its tag instead of its title. On the wall a title
  // says what the shot is and the tag whose it is, and a product goes by
  // whose it is. An item without a tag keeps its title
  namedByTag?: boolean;
}

/**
 * A home list in a modal, one card per item with its link in the corner:
 * the experiments, and the products to try.
 */
const ItemsModal = ({
  isOpen,
  onClose,
  title,
  intro,
  items,
  namedByTag,
}: Props) => {
  const introTextRef = useRef<AnimatedTextHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  const handleOpenComplete = useCallback(() => {
    introTextRef.current?.triggerAnimation();

    if (!listRef.current) return;
    const entries = listRef.current.querySelectorAll(":scope > *");

    if (!animationsEnabled) {
      gsap.set(entries, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      entries,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 },
    );
  }, [animationsEnabled]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onOpenComplete={handleOpenComplete}
    >
      <AnimatedText
        ref={introTextRef}
        as="p"
        className="mb-8 max-w-2xl font-light text-base text-neutral-950/66"
        trigger="manual"
      >
        {intro}
      </AnimatedText>

      <div ref={listRef} className="flex flex-col gap-4">
        {items.map((item) => {
          // Matches the wall tiles: neutral cards get a dark header
          const isNeutral = item.background === "neutral";
          // The tag names the card in place of the title, so it isn't
          // repeated as a pill
          const brand = namedByTag ? item.tag : undefined;

          return (
            <article
              key={item.id}
              className="@container relative inset-border overflow-hidden rounded-4xl"
              style={{ opacity: 0, background: getWallBackground(item) }}
            >
              {/* Header */}
              <div
                className={cn(
                  "pb-[clamp(0.75rem,3cqw,1.25rem)]",
                  PADDING_X,
                  PADDING_TOP,
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3
                    className={cn(
                      "flex items-center gap-2 text-[clamp(1rem,3cqw,1.375rem)]",
                      isNeutral ? "text-neutral-950" : "text-neutral-50",
                    )}
                  >
                    {brand?.logo && (
                      <TagLogo logo={brand.logo} className="h-[0.9em] w-[1.1em]" />
                    )}
                    {brand ? brand.label : item.title}
                  </h3>
                  {item.tag && !brand && (
                    <WallTag
                      tag={item.tag}
                      className={isNeutral ? "text-neutral-50" : "bg-neutral-50"}
                      style={
                        isNeutral
                          ? { backgroundColor: item.tag.color }
                          : { color: item.tag.color }
                      }
                    />
                  )}
                </div>
                {item.description && (
                  <p
                    className={cn(
                      "mt-2 max-w-xl font-light text-base",
                      isNeutral ? "text-neutral-950/66" : "text-neutral-50/75",
                    )}
                  >
                    {item.description}
                  </p>
                )}
              </div>

              {/* Media runs off the right and bottom edges, like on the wall */}
              <div className={PADDING_LEFT}>
                <div
                  className={cn(
                    // bg-clip-padding lets the card show through the translucent rim
                    "relative w-full overflow-hidden rounded-tl-3xl border-t-6 border-l-6 bg-neutral-50 bg-clip-padding",
                    isNeutral ? "border-neutral-950/5" : "border-neutral-50/20",
                  )}
                  style={{ aspectRatio: item.media.width / item.media.height }}
                >
                  <WallMedia
                    item={item}
                    sizes="(min-width: 896px) 848px, 100vw"
                  />
                </div>
              </div>

              {item.link && (
                <a
                  href={item.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={haptic.onClick}
                  onMouseEnter={haptic.onMouseEnter}
                  className="absolute right-4 bottom-4 flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-neutral-50 text-sm transition-colors duration-200 hover:bg-primary-600"
                >
                  {item.link.label}
                  <ArrowUpRight className="size-4" />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </Modal>
  );
};

export default ItemsModal;
