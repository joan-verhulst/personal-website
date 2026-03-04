"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { DigitalArtProject } from "~/data/digital-art-projects";
import AnimatedText, {
  type AnimatedTextHandle,
} from "~/modules/core/components/utils/AnimatedText";
import cn from "~/utils/cn";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: DigitalArtProject[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

const VERTICAL_PADDING = 96;
const PRELOAD_RADIUS = 2;

const getImageHeight = () => window.innerHeight - VERTICAL_PADDING;
const getImageWidth = (
  naturalWidth: number,
  naturalHeight: number,
  fixedHeight: number,
) => fixedHeight * (naturalWidth / naturalHeight);

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
        img.onload = async () => {
          await img.decode();
          imageCache.current[i] = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
        };
        img.src = items[i].image;
      }
    },
    [items],
  );

  useEffect(() => {
    preloadAround(activeIndex);
  }, [activeIndex, preloadAround]);

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
    const cached = imageCache.current[activeIndexRef.current];
    const width = cached
      ? getImageWidth(cached.width, cached.height, fixedHeight)
      : fixedHeight;
    gsap.set(containerRef.current, { width, height: fixedHeight });
    gsap.set(contentRef.current, {
      y: window.innerHeight,
      scale: 1.3,
      opacity: 1,
    });
    gsap.set(actionBarRef.current, { y: 100, opacity: 1 });

    resplitText();

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
  }, [items, triggerTextAnimations, resplitText]);

  // ── Close ─────────────────────────────────────────────────────────────────────

  const animateClose = useCallback(() => {
    if (!overlayRef.current || !contentRef.current || !actionBarRef.current)
      return;

    isFirstOpen.current = true;
    prevActiveIndex.current = activeIndexRef.current;

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
  }, [onClose]);

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
    const cached = imageCache.current[toIndex];

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
              duration: 0.5,
              delay: 0.05,
              ease: "power2.inOut",
            }
          : {},
      )
      .add(triggerTextAnimations);
  }, [
    activeIndex,
    isOpen,
    items,
    onActiveIndexChange,
    triggerTextAnimations,
    resplitText,
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
        const cached = imageCache.current[activeIndexRef.current];
        const width = cached
          ? getImageWidth(cached.width, cached.height, fixedHeight)
          : fixedHeight;
        gsap.set(containerRef.current, { width, height: fixedHeight });
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

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
            className="relative overflow-hidden rounded-2xl border border-neutral-50/20"
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
          onClick={() =>
            hasPrev &&
            !isAnimating.current &&
            onActiveIndexChange(activeIndex - 1)
          }
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
          onClick={() =>
            hasNext &&
            !isAnimating.current &&
            onActiveIndexChange(activeIndex + 1)
          }
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
          onClick={animateClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-50 bg-primary-500 hover:bg-primary-500/75 transition-colors duration-200 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default ImagePopover;
