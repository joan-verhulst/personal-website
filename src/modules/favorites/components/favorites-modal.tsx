"use client";

import { gsap } from "gsap";
import { type ReactNode, useCallback, useRef } from "react";
import Modal from "~/modules/core/components/modal";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * The modal On Rotation and Gear each open in, the same size for both so they
 * line up on the same width.
 */
const FavoritesModal = ({ isOpen, onClose, title, children }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();

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
      title={title}
      onOpenComplete={handleOpenComplete}
      // Sized so the player has the same space on every side. Whatever is
      // taller scrolls inside it. On small screens it takes the height there
      // is, as everything stacks
      className="h-[90dvh] md:h-[min(32.5625rem,90vh)]"
    >
      {/*
        The width everything lines up on. On large screens the deck's height
        follows its width, so this is as wide as lets the deck fit the height:
        the deck is 1.2 of 2.2 parts of the width less the gap, and 0.9 as tall
        as wide. On a tall enough window it's simply the full width. Its
        height is measured against on small screens too, see the gear's pages.
      */}
      <div
        ref={contentRef}
        className="@container-[size] h-full md:[--stage:calc(100cqh/0.9*2.2/1.2+1rem)]"
        style={{ opacity: 0 }}
      >
        {/*
          Padded past its edges, so the deck's shadow isn't cut off by the
          scroll box. Neither scrolls on large screens: both fit the width above
        */}
        <div className="-mx-4 -my-6 h-[calc(100%+3rem)] overflow-y-auto px-4 py-6 md:overflow-hidden">
          <div className="mx-auto w-full max-w-(--stage)">{children}</div>
        </div>
      </div>
    </Modal>
  );
};

export default FavoritesModal;
