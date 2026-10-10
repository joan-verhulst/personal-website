"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { DigitalArtProject } from "~/modules/content/types";
import AnimatedText, {
  type AnimatedTextHandle,
} from "~/modules/core/components/utils/AnimatedText";
import cn from "~/utils/cn";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

// Width and height are optional, without them the size is known once the image has preloaded
type PopoverItem = DigitalArtProject & { width?: number; height?: number };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: PopoverItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

const VERTICAL_PADDING = 96;
const HORIZONTAL_PADDING = 48;
const PRELOAD_RADIUS = 2;

const getImageHeight = () => window.innerHeight - VERTICAL_PADDING;
const getMaxWidth = () => window.innerWidth - HORIZONTAL_PADDING;
const getImageWidth = (
  naturalWidth: number,
  naturalHeight: number,
  fixedHeight: number,
) => Math.min(fixedHeight * (naturalWidth / naturalHeight), getMaxWidth());

const ImagePopover = ({
  isOpen,
  onClose,
  items,
  activeIndex,
  onActiveIndexChange,
}: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  const activeSlot = useRef<"a" | "b">("a");
  const imageCache = useRef<Record<number, { width: number; height: number }>>(
    {},
  );
  const preloadedIndices = useRef<Set<number>>(new Set());
  const isAnimating = useRef(false);
  const pendingIndex = useRef<number | null>(null);
  const prevActiveIndex = useRef(activeIndex);
  const activeIndexRef = useRef(activeIndex);
  const isFirstOpen = useRef(true);
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleRef = useRef<AnimatedTextHandle>(null);
  const descriptionRef = useRef<AnimatedTextHandle>(null);

  const [isAnimatingState, setIsAnimatingState] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(activeIndex);
  const [mounted, setMounted] = useState(false);

  const item = items[displayIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // ── Preload ───────────────────────────────────────────────────────────────────

  const preloadAround = useCallback(
    (index: number) => {
      const start = Math.max(0, index - PRELOAD_RADIUS);
      const end = Math.min(items.length - 1, index + PRELOAD_RADIUS);
      for (let i = start; i <= end; i++) {
        if (preloadedIndices.current.has(i)) continue;
        preloadedIndices.current.add(i);
        const img = new Image();
        img.onload = () => {
          imageCache.current[i] = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          // Decoding ahead keeps the slide smooth, a failed decode just happens on show instead
          img.decode().catch(() => {});
        };
        img.src = items[i].image;
      }
    },
    [items],
  );

  useEffect(() => {
    preloadAround(activeIndex);
  }, [activeIndex, preloadAround]);

  // Natural size of an item: from the preload, or from the item itself before that
  const getKnownSize = useCallback(
    (index: number) => {
      const cached = imageCache.current[index];
      if (cached) return cached;
      const { width, height } = items[index] ?? {};
      return width && height ? { width, height } : undefined;
    },
    [items],
  );

  // ── Text ──────────────────────────────────────────────────────────────────────

  const triggerTextAnimations = useCallback(() => {
    titleRef.current?.triggerAnimation();
    setTimeout(() => descriptionRef.current?.triggerAnimation(), 80);
  }, []);

  const resplitText = useCallback(() => {
    setTimeout(() => {
      titleRef.current?.resplit();
      descriptionRef.current?.resplit();
    }, 0);
  }, []);

  // ── Open ──────────────────────────────────────────────────────────────────────

  const animateOpen = useCallback(() => {
    if (
      !overlayRef.current ||
      !contentRef.current ||
      !containerRef.current ||
      !actionBarRef.current
    )
      return;

    activeSlot.current = "a";
    gsap.set(overlayRef.current, { display: "flex", opacity: 1 });

    if (imgARef.current) {
      imgARef.current.src = items[activeIndexRef.current].image;
      imgARef.current.alt = items[activeIndexRef.current].title;
      gsap.set(imgARef.current, { x: 0, opacity: 1 });
    }
    if (imgBRef.current) gsap.set(imgBRef.current, { opacity: 0, x: 0 });

    const fixedHeight = getImageHeight();
    const cached = getKnownSize(activeIndexRef.current);
    const width = cached
      ? getImageWidth(cached.width, cached.height, fixedHeight)
      : Math.min(fixedHeight, getMaxWidth());
    const height = cached
      ? Math.min(fixedHeight, width / (cached.width / cached.height))
      : fixedHeight;
    gsap.set(containerRef.current, { width, height });
    gsap.set(contentRef.current, {
      y: window.innerHeight,
      scale: 1.3,
      opacity: 1,
    });
    gsap.set(actionBarRef.current, { y: 100, opacity: 1 });

    // Title and description otherwise keep showing the last item navigated to
    setDisplayIndex(activeIndexRef.current);
    resplitText();

    if (!animationsEnabled) {
      gsap.set(overlayRef.current, { opacity: 1 });
      gsap.set(contentRef.current, { y: 0, scale: 1 });
      gsap.set(actionBarRef.current, { y: 0 });
      isFirstOpen.current = false;
      prevActiveIndex.current = activeIndexRef.current;
      triggerTextAnimations();
      return;
    }

    gsap
      .timeline({
        onComplete: () => {
          isFirstOpen.current = false;
          prevActiveIndex.current = activeIndexRef.current;
          triggerTextAnimations();
        },
      })
      .fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "power2.out" },
      )
      .to(
        contentRef.current,
        { y: 0, scale: 1, duration: 0.6, ease: "power2.out" },
        "-=0.1",
      )
      .to(
        actionBarRef.current,
        { y: 0, duration: 0.4, ease: "power2.out" },
        "-=0.35",
      );
  }, [
    items,
    getKnownSize,
    triggerTextAnimations,
    resplitText,
    animationsEnabled,
  ]);

  // ── Close ─────────────────────────────────────────────────────────────────────

  const animateClose = useCallback(() => {
    if (!overlayRef.current || !contentRef.current || !actionBarRef.current)
      return;

    isFirstOpen.current = true;
    prevActiveIndex.current = activeIndexRef.current;

    if (!animationsEnabled) {
      gsap.set(overlayRef.current, { display: "none" });
      onClose();
      return;
    }

    gsap
      .timeline({
        onComplete: () => {
          gsap.set(overlayRef.current, { display: "none" });
          onClose();
        },
      })
      .to(actionBarRef.current, { y: 100, duration: 0.3, ease: "power2.in" })
      .to(
        contentRef.current,
        {
          y: window.innerHeight,
          scale: 1.3,
          duration: 0.45,
          ease: "power2.in",
        },
        "-=0.2",
      )
      .to(
        overlayRef.current,
        { opacity: 0, duration: 0.15, ease: "power2.in" },
        "-=0.15",
      );
  }, [onClose, animationsEnabled]);

  useEffect(() => {
    if (isOpen) animateOpen();
  }, [isOpen, animateOpen]);

  // ── Navigate ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      !isOpen ||
      isFirstOpen.current ||
      prevActiveIndex.current === activeIndex
    )
      return;

    const fromIndex = prevActiveIndex.current;
    const toIndex = activeIndex;
    prevActiveIndex.current = toIndex;

    if (isAnimating.current) {
      pendingIndex.current = activeIndex;
      return;
    }

    isAnimating.current = true;
    setIsAnimatingState(true);

    const direction = toIndex > fromIndex ? 1 : -1;
    const outgoingSlot = activeSlot.current;
    const incomingSlot = outgoingSlot === "a" ? "b" : "a";
    activeSlot.current = incomingSlot;

    const outgoingImg =
      outgoingSlot === "a" ? imgARef.current : imgBRef.current;
    const incomingImg =
      incomingSlot === "a" ? imgARef.current : imgBRef.current;

    if (!outgoingImg || !incomingImg || !containerRef.current) {
      isAnimating.current = false;
      setIsAnimatingState(false);
      return;
    }

    gsap.killTweensOf([containerRef.current, outgoingImg, incomingImg]);

    if (incomingImg.src !== items[toIndex].image)
      incomingImg.src = items[toIndex].image;
    gsap.set(incomingImg, {
      x: direction * containerRef.current.offsetWidth,
      opacity: 1,
    });

    setDisplayIndex(toIndex);
    resplitText();

    const fixedHeight = getImageHeight();
    const cached = getKnownSize(toIndex);

    if (!animationsEnabled) {
      // Instant snap: position incoming image, hide outgoing
      gsap.set(outgoingImg, { opacity: 0, x: 0 });
      gsap.set(incomingImg, { x: 0, opacity: 1 });
      if (cached) {
        const w = getImageWidth(cached.width, cached.height, fixedHeight);
        const h = Math.min(fixedHeight, w / (cached.width / cached.height));
        gsap.set(containerRef.current, { width: w, height: h });
      }
      isAnimating.current = false;
      setIsAnimatingState(false);
      triggerTextAnimations();
      if (pendingIndex.current !== null) {
        const next = pendingIndex.current;
        pendingIndex.current = null;
        onActiveIndexChange(next);
      }
      return;
    }

    gsap
      .timeline({
        onComplete: () => {
          isAnimating.current = false;
          setIsAnimatingState(false);
          gsap.set(outgoingImg, { opacity: 0, x: 0 });
          if (pendingIndex.current !== null) {
            const next = pendingIndex.current;
            pendingIndex.current = null;
            onActiveIndexChange(next);
          }
        },
      })
      .to(outgoingImg, {
        x: -direction * containerRef.current.offsetWidth,
        duration: 0.6,
        ease: "power2.inOut",
      })
      .to(incomingImg, { x: 0, duration: 0.6, ease: "power2.inOut" }, "<")
      .set(outgoingImg, { opacity: 0, x: 0 })
      .to(
        containerRef.current,
        cached
          ? {
              width: getImageWidth(cached.width, cached.height, fixedHeight),
              height: Math.min(
                fixedHeight,
                getImageWidth(cached.width, cached.height, fixedHeight) /
                  (cached.width / cached.height),
              ),
              duration: animationsEnabled ? 0.5 : 0,
              delay: animationsEnabled ? 0.05 : 0,
              ease: "power2.inOut",
            }
          : {},
      )
      .add(triggerTextAnimations);
  }, [
    activeIndex,
    isOpen,
    items,
    getKnownSize,
    onActiveIndexChange,
    triggerTextAnimations,
    resplitText,
    animationsEnabled,
  ]);

  // ── Keyboard ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") animateClose();
      if (e.key === "ArrowLeft" && hasPrev && !isAnimating.current)
        onActiveIndexChange(activeIndex - 1);
      if (e.key === "ArrowRight" && hasNext && !isAnimating.current)
        onActiveIndexChange(activeIndex + 1);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    animateClose,
    hasPrev,
    hasNext,
    activeIndex,
    onActiveIndexChange,
  ]);

  // ── Scroll lock ───────────────────────────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  // ── Resize ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        if (!containerRef.current) return;
        const fixedHeight = getImageHeight();
        const cached = getKnownSize(activeIndexRef.current);
        const width = cached
          ? getImageWidth(cached.width, cached.height, fixedHeight)
          : Math.min(fixedHeight, getMaxWidth());
        const height = cached
          ? Math.min(fixedHeight, width / (cached.width / cached.height))
          : fixedHeight;
        gsap.set(containerRef.current, { width, height });
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, getKnownSize]);

  // ── Cleanup all GSAP animations on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      [
        overlayRef,
        contentRef,
        containerRef,
        actionBarRef,
        imgARef,
        imgBRef,
      ].forEach((r) => {
        if (r.current) gsap.killTweensOf(r.current);
      });
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!mounted || !item) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 h-screen "
      onClick={(e) => {
        if (e.target === overlayRef.current) animateClose();
      }}
      style={{ opacity: 0, display: "none" }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-6 md:p-8 bg-neutral-950/75">
        <div
          ref={contentRef}
          className="flex flex-col items-center gap-5"
          style={{ opacity: 1 }}
        >
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl inset-border [--inset-border-color:color-mix(in_oklab,var(--color-neutral-50)_20%,transparent)]"
          >
            <img
              ref={imgARef}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <img
              ref={imgBRef}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0 }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-linear-to-t from-neutral-950/75 from-10% to-transparent to-40% pointer-events-none" />
            <div className="absolute bottom-8 left-8 flex flex-col gap-1">
              <AnimatedText
                ref={titleRef}
                as="h2"
                className="text-neutral-50 text-lg font-medium"
                trigger="manual"
              >
                {item.title}
              </AnimatedText>
              {item.description && (
                <AnimatedText
                  ref={descriptionRef}
                  as="p"
                  className="text-neutral-50/75 text-sm font-light max-w-md"
                  trigger="manual"
                >
                  {item.description}
                </AnimatedText>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={actionBarRef}
        className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2 border border-neutral-50/10 flex items-center gap-1.5 bg-neutral-50 rounded-xl px-1 py-1"
      >
        <button
          onClick={() => {
            if (hasPrev && !isAnimating.current) {
              haptic.onClick();
              onActiveIndexChange(activeIndex - 1);
            }
          }}
          onMouseEnter={haptic.onMouseEnter}
          disabled={!hasPrev || isAnimatingState}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg text-neutral-950 transition-all duration-200",
            !hasPrev && "opacity-25 cursor-not-allowed",
            isAnimatingState && hasPrev && "opacity-25 cursor-progress",
            hasPrev &&
              !isAnimatingState &&
              "hover:bg-neutral-950/10 cursor-pointer",
          )}
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-neutral-950/50 text-xs tabular-nums px-1">
          {activeIndex + 1} / {items.length}
        </span>

        <button
          onClick={() => {
            if (hasNext && !isAnimating.current) {
              haptic.onClick();
              onActiveIndexChange(activeIndex + 1);
            }
          }}
          onMouseEnter={haptic.onMouseEnter}
          disabled={!hasNext || isAnimatingState}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg text-neutral-950 transition-all duration-200",
            !hasNext && "opacity-25 cursor-not-allowed",
            isAnimatingState && hasNext && "opacity-25 cursor-progress",
            hasNext &&
              !isAnimatingState &&
              "hover:bg-neutral-950/10 cursor-pointer",
          )}
        >
          <ChevronRight size={14} />
        </button>

        <div className="w-px h-5 bg-neutral-950/10" />

        <button
          onClick={() => {
            haptic.onClick();
            animateClose();
          }}
          onMouseEnter={haptic.onMouseEnter}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-primary-500 text-neutral-50 transition-colors duration-200 hover:bg-primary-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default ImagePopover;
