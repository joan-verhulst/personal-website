"use client";

import { gsap } from "gsap";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  type FavoritesSection,
  favoritesSections,
  gear,
} from "~/data/favorites";
import { useContent } from "~/modules/content/components/content-provider";
import Modal from "~/modules/core/components/modal";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import Gear from "~/modules/favorites/components/gear";
import OnRotation from "~/modules/favorites/components/on-rotation";
import cn from "~/utils/cn";

// Gear's thumbnail is a cut-out, so it gets a backdrop to stand against
const BACKDROPS: Partial<Record<FavoritesSection, string>> = {
  gear: "bg-linear-to-b from-[#626D77] to-[#1E2D3C]",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FavoritesModal = ({ isOpen, onClose }: Props) => {
  const { records } = useContent();
  const [section, setSection] = useState<FavoritesSection>("on-rotation");

  // What each section holds, shown on its tile like the count on a home widget
  const counts: Record<FavoritesSection, string> = {
    "on-rotation": `${records.length} records`,
    gear: `${gear.length} pieces`,
  };
  const thumbnails: Record<FavoritesSection, string | undefined> = {
    "on-rotation": records[0]?.cover,
    gear: favoritesSections.find(({ id }) => id === "gear")?.image,
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  const handleOpenComplete = useCallback(() => {
    if (!contentRef.current) return;

    if (!animationsEnabled) {
      gsap.set(contentRef.current, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
    );
  }, [animationsEnabled]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Favorites"
      onOpenComplete={handleOpenComplete}
      // One height for both sections, so switching never resizes the modal.
      // Sized so the player has the same space on every side. Whatever is
      // taller scrolls inside it
      className="h-[min(37.625rem,90vh)]"
    >
      {/*
        The width everything lines up on. On large screens the deck's height
        follows its width, so this is as wide as lets the deck fit what's left
        of the height: the switcher and the line under it take 81px, the deck
        is 1.2 of 2.2 parts of the width less the gap, and 0.9 as tall as wide.
        On a tall enough window it's simply the full width.
      */}
      <div
        ref={contentRef}
        className="flex h-full flex-col md:[--stage:calc((100cqh-81px)/0.9*2.2/1.2+1rem)] md:[container-type:size]"
        style={{ opacity: 0 }}
      >
        {/* Closed off with a line across the whole modal, like the bar above it */}
        <div className="-mx-6 -mt-2 shrink-0 border-neutral-950/10 border-b px-6 pb-4">
          {/*
            One wide switcher: a grey track, with the open section lifted out
            of it. Each tab shows its picture, its name and what it holds
          */}
          <div
            role="tablist"
            aria-label="Favorites"
            className="mx-auto grid h-12 w-full max-w-(--stage) grid-cols-2 gap-1 rounded-full bg-neutral-200 p-1"
          >
            {favoritesSections.map(({ id, label }) => {
              const image = thumbnails[id];
              const isActive = section === id;
              const backdrop = BACKDROPS[id];

              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    haptic.onClick();
                    setSection(id);
                  }}
                  onMouseEnter={haptic.onMouseEnter}
                  className={cn(
                    "group flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
                    isActive
                      ? "bg-neutral-50 shadow-[0_1px_2px_rgb(15_15_15/0.08)]"
                      : "hover:bg-neutral-50/50",
                  )}
                >
                  <span
                    className={cn(
                      "relative inset-border size-5 shrink-0 overflow-hidden rounded-[5px]",
                      backdrop ?? "bg-neutral-100",
                    )}
                  >
                    {image && (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="20px"
                        className={cn(
                          "pointer-events-none",
                          backdrop ? "object-contain p-px" : "object-cover",
                        )}
                      />
                    )}
                  </span>

                  <span
                    className={cn(
                      "min-w-0 truncate text-sm transition-colors duration-200",
                      isActive
                        ? "text-neutral-950"
                        : "text-neutral-950/60 group-hover:text-neutral-950",
                    )}
                  >
                    {label}
                  </span>

                  <span className="hidden h-5 shrink-0 items-center rounded-full bg-primary-500/15 px-2 text-primary-500 text-xs tabular-nums sm:flex">
                    {counts[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Padded past its edges, so the deck's shadow isn't cut off by the scroll box */}
        <div
          role="tabpanel"
          className={cn(
            "-mx-4 -mb-6 min-h-0 flex-1 overflow-y-auto px-4 py-6",
            // Neither section scrolls on large screens: both fit the width above
            "md:overflow-hidden",
          )}
        >
          <div className="mx-auto w-full max-w-(--stage)">
            {section === "on-rotation" ? <OnRotation /> : <Gear />}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FavoritesModal;
