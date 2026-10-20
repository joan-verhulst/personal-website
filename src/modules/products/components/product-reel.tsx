"use client";

import { gsap } from "gsap";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Product } from "~/modules/content/types";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import { TagLogo } from "~/modules/ui-ux/components/wall-tag";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import { getState, type Phase, subscribe } from "~/utils/app-layer";
import cn from "~/utils/cn";

// How long each product shows before the next one comes up
const SLIDE_MS = 5000;

interface Props {
  products: Product[];
  sizes: string;
  // The reel waits while the app layer is in one of these phases
  pausedIn: Phase[];
  // Corner radius of the stage and every slide
  radius: string;
  // Room around a screenshot, the reels fill the stage
  inset: string;
  tag: string;
  dots: string;
  className?: string;
  // Wraps the stage, e.g. in a link. The dots stay outside, buttons of their own
  frame: (stage: ReactNode) => ReactNode;
}

const ProductReel = ({
  products,
  sizes,
  pausedIn,
  radius,
  inset,
  tag,
  dots,
  className,
  frame,
}: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);
  const [isInView, setIsInView] = useState(true);
  const { phase } = useSyncExternalStore(subscribe, getState, getState);
  const { animationsEnabled } = useAnimationPreference();
  const current = products[active] ?? products[0];
  const isPaused = pausedIn.includes(phase);

  const showSlide = useCallback(
    (next: number) => {
      if (next === active) return;
      const from = slideRefs.current[active];
      const to = slideRefs.current[next];
      if (!from || !to) return;

      timelineRef.current?.kill();
      slideRefs.current.forEach((slide, index) => {
        if (slide && index !== active && index !== next)
          gsap.set(slide, { y: "100%", scale: 1 });
      });
      if (
        !animationsEnabled ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(from, { y: "100%", scale: 1 });
        gsap.set(to, { y: "0%", scale: 1 });
        setActive(next);
        return;
      }

      setActive(next);
      timelineRef.current = gsap
        .timeline({ defaults: { ease: "power2.inOut" } })
        .to(from, { scale: 0.9, duration: 0.3 })
        .to(from, { y: "-100%", duration: 0.4 }, "-=0.1")
        .fromTo(
          to,
          { y: "100%", scale: 0.9 },
          { y: "0%", duration: 0.4 },
          "-=0.2",
        )
        .to(to, { scale: 1, duration: 0.3 }, "-=0.1")
        .set(from, { y: "100%", scale: 1 });
    },
    [active, animationsEnabled],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let isOnScreen = true;
    const update = () => setIsInView(isOnScreen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
      update();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (products.length < 2 || !isInView || isPaused) return;
    const timer = setTimeout(
      () => showSlide((active + 1) % products.length),
      SLIDE_MS,
    );
    return () => clearTimeout(timer);
  }, [active, products.length, showSlide, isInView, isPaused]);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
    },
    [],
  );

  const stage = (
    <div
      className={cn(
        "pointer-events-none relative h-full w-full overflow-hidden",
        radius,
      )}
    >
      {products.map((product, index) => {
        const item = {
          title: product.name,
          media: product.media,
          bare: product.bare,
        };

        return (
          <div
            key={product.id}
            ref={(element) => {
              slideRefs.current[index] = element;
            }}
            className={cn(
              "absolute inset-0 overflow-hidden",
              radius,
              index !== 0 && "translate-y-full",
            )}
            style={{ background: getWallBackground(product) }}
          >
            {/* A reel fills the card, a screenshot sits in it like on
                the UI/UX widget */}
            {product.bare ? (
              <WallMedia item={item} sizes={sizes} />
            ) : (
              <div className={cn("absolute inset-0", inset)}>
                <div className="relative inset-border h-full overflow-hidden rounded-t-xl">
                  <WallMedia item={item} sizes={sizes} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {current && (
        <div
          className={cn(
            "absolute flex h-6 items-center gap-1.5 rounded-[0.625rem] bg-neutral-950/33 px-2 text-neutral-50 text-sm backdrop-blur-lg",
            tag,
          )}
        >
          {current.logo && (
            <TagLogo logo={current.logo} className="h-3 w-3.5" />
          )}
          {current.name}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {frame(stage)}

      {products.length > 1 && (
        <div className={cn("absolute flex", dots)}>
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              aria-label={`Show ${product.name}`}
              onClick={() => showSlide(index)}
              className="flex size-2 cursor-pointer items-center justify-center"
            >
              <span
                className={cn(
                  "size-1 rounded-full transition-colors duration-300",
                  index === active ? "bg-neutral-950" : "bg-neutral-950/33",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReel;
