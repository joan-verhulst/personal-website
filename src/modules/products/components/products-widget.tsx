"use client";

import { gsap } from "gsap";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { widgets } from "~/data/widgets";
import type { Product } from "~/modules/content/types";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import { TagLogo } from "~/modules/ui-ux/components/wall-tag";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import { getState, subscribe } from "~/utils/app-layer";
import cn from "~/utils/cn";
import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widget-card";

// How long each product shows before the next one comes up
const SLIDE_MS = 5000;

interface Props {
  products: Product[];
}

/**
 * The products on home, one after another like the pieces on the UI/UX
 * widget: the one showing shrinks and rises away while the next comes up
 * from below. The pill names it, the dots beside the card jump to one, and
 * the card opens the products page.
 */
const ProductsWidget = ({ products }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);
  // On the screen, in a tab that's showing
  const [isInView, setIsInView] = useState(true);
  // Home stays mounted under an open section, only hidden, which the browser
  // doesn't count as off the screen
  const { phase } = useSyncExternalStore(subscribe, getState, getState);
  const { animationsEnabled } = useAnimationPreference();
  const current = products[active] ?? products[0];

  const showSlide = useCallback(
    (next: number) => {
      if (next === active) return;
      const from = slideRefs.current[active];
      const to = slideRefs.current[next];
      if (!from || !to) return;

      timelineRef.current?.kill();
      // A transition cut short leaves its slides wherever they were, over the
      // card. All but these two go back under it, so only the next one is
      // left showing
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

      // The same steps as the UI/UX widget: down a little, up and away, and
      // the next one up from below, growing into place
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
        // Back under the card, ready to come up again
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
    // Opened in a tab that isn't showing, the observer only reports once it is
    update();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Every few seconds the next one, round and round. Only while it can be
  // seen: back in view, the wait starts over
  useEffect(() => {
    if (products.length < 2 || !isInView || phase !== "closed") return;
    const timer = setTimeout(
      () => showSlide((active + 1) % products.length),
      SLIDE_MS,
    );
    return () => clearTimeout(timer);
  }, [active, products.length, showSlide, isInView, phase]);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
    },
    [],
  );

  return (
    <div ref={rootRef} className="relative h-full">
      <TransitionLink href="/products" className="block h-full">
        <WidgetCard label={widgets.products.label} className="h-full">
          <div className="pointer-events-none relative h-full w-full overflow-hidden rounded-4xl">
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
                    "absolute inset-0 overflow-hidden rounded-4xl",
                    index !== 0 && "translate-y-full",
                  )}
                  style={{ background: getWallBackground(product) }}
                >
                  {/* A reel fills the card, a screenshot sits in it like on
                      the UI/UX widget */}
                  {product.bare ? (
                    <WallMedia
                      item={item}
                      sizes="(min-width: 768px) 256px, 100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 px-6 pt-4">
                      <div className="relative inset-border h-full overflow-hidden rounded-t-xl">
                        <WallMedia
                          item={item}
                          sizes="(min-width: 768px) 256px, 100vw"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
  
            {current && (
              <div className="absolute bottom-4 left-4 flex h-6 items-center gap-1.5 rounded-[0.625rem] bg-neutral-950/33 px-2 text-neutral-50 text-sm backdrop-blur-lg">
                {current.logo && (
                  <TagLogo logo={current.logo} className="h-3 w-3.5" />
                )}
                {current.name}
              </div>
            )}
          </div>
        </WidgetCard>
      </TransitionLink>

      {/* One dot for each product, beside the card. Next to the link rather
          than in it, so they're buttons of their own */}
      {products.length > 1 && (
        <div className="absolute top-1/2 right-0 flex translate-x-4.5 -translate-y-1/2 flex-col">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              aria-label={`Show ${product.name}`}
              onClick={() => showSlide(index)}
              // A larger target than the dot it shows
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

export default ProductsWidget;
