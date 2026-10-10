"use client";

import { gsap } from "gsap";
import { X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  onOpenComplete?: () => void;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  onOpenComplete,
}: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const animateOpen = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    timelineRef.current?.kill();

    if (
      !animationsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.set(overlayRef.current, { opacity: 1 });
      gsap.set(modalRef.current, { scale: 1, y: 0 });
      onOpenComplete?.();
      return;
    }

    const tl = gsap.timeline({
      onComplete: onOpenComplete,
    });
    timelineRef.current = tl;

    tl.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2 },
    );

    tl.fromTo(
      modalRef.current,
      { scale: 4, y: "200vh" },
      { scale: 1, y: 0, duration: 0.5, ease: "power2.inOut" },
    );
  }, [onOpenComplete, animationsEnabled]);

  const animateClose = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    timelineRef.current?.kill();

    if (
      !animationsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }

    const tl = gsap.timeline({
      onComplete: onClose,
    });
    timelineRef.current = tl;

    tl.to(modalRef.current, {
      scale: 4,
      y: "200vh",
      duration: 0.5,
      ease: "power2.inOut",
    });

    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, "-=0.3");
  }, [onClose, animationsEnabled]);

  useEffect(() => {
    if (isOpen && mounted) {
      animateOpen();
    }

    return () => {
      timelineRef.current?.kill();
    };
  }, [isOpen, mounted, animateOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        animateClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, animateClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      animateClose();
    }
  };

  const handleCloseClick = () => {
    haptic.onClick();
    animateClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-modal
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-neutral-950/50 p-4"
      style={{ opacity: 0 }}
    >
      <div
        ref={modalRef}
        // Merged, so a modal can be made narrower than max-w-4xl
        className={cn(
          "relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-neutral-950/10 bg-neutral-50",
          className,
        )}
        style={{ transform: "translateY(100dvh) scale(4)" }}
      >
        {/* Header */}
        <div className="z-10 flex shrink-0 items-center justify-between rounded-t-3xl border-neutral-950/10 border-b bg-neutral-50 py-4 pr-4 pl-6">
          {title ? (
            <span className="font-regular text-md text-neutral-950">
              {title}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleCloseClick}
            onMouseEnter={haptic.onMouseEnter}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-full border-neutral-950/15 text-neutral-950 transition-colors hover:bg-neutral-100"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
