"use client";

import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import { type CSSProperties, useLayoutEffect, useRef } from "react";
import { useContent } from "~/modules/content/components/content-provider";
import type { Product } from "~/modules/content/types";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import { TagLogo } from "~/modules/ui-ux/components/wall-tag";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";
import { track } from "~/utils/eyes";
import { scrollerOf } from "~/utils/footer";

// The same padding as the UI/UX wall's tiles, scaling with the card
const PADDING_X = "px-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_LEFT = "pl-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_TOP = "pt-[clamp(1.25rem,6cqw,3rem)]";

const SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * A product as a tile on the UI/UX wall: its name and what it is over its
 * background, the way in where the wall has its button, and its shot running
 * off the right and bottom edges. The whole tile opens the product.
 */
const ProductTile = ({ product }: { product: Product }) => {
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const { link } = product;
  // Matches the wall tiles: neutral cards and light reels get dark text
  const isNeutral = product.background === "neutral";
  const item = { title: product.name, media: product.media, bare: product.bare };

  const tileStyle = {
    background: getWallBackground(product),
    "--media-aspect": product.media.width / product.media.height,
  } as CSSProperties;

  // Scales up from the bottom left so the shot stays anchored to the card
  const hoverScale =
    link &&
    animationsEnabled &&
    "origin-bottom-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]";

  const header = (
    <span
      className={cn(
        "flex flex-col gap-[clamp(0.25rem,1cqw,0.5rem)] pb-[clamp(0.75rem,3cqw,1.25rem)]",
        PADDING_X,
        PADDING_TOP,
      )}
    >
      <span className="flex items-start gap-2">
        <h2
          className={cn(
            "flex min-h-8 min-w-0 flex-1 items-center gap-2 text-[clamp(0.875rem,2.5cqw,1.125rem)]",
            isNeutral ? "text-neutral-950" : "text-neutral-50",
          )}
        >
          {product.logo && (
            <TagLogo logo={product.logo} className="h-[0.8em] w-[1em]" />
          )}
          <span className="truncate">{product.name}</span>
        </h2>
        {/* The wall's round button, wide enough for the link's label */}
        {link && (
          <span
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-3.5 text-sm transition-colors duration-300",
              isNeutral
                ? "border-neutral-950/10 text-neutral-950 group-hover:bg-neutral-950/5"
                : "border-neutral-50/20 text-neutral-50 group-hover:bg-neutral-50/15",
            )}
          >
            {link.label}
            <ArrowUpRight className="size-4" />
          </span>
        )}
      </span>
      {product.description && (
        <span
          className={cn(
            "block max-w-xl font-light text-[clamp(0.875rem,2.25cqw,1rem)]",
            isNeutral ? "text-neutral-950/66" : "text-neutral-50/75",
          )}
        >
          {product.description}
        </span>
      )}
    </span>
  );

  const content = product.bare ? (
    // A reel is the card, with the header over its top
    <>
      <span className={cn("absolute inset-0 overflow-hidden", hoverScale)}>
        <WallMedia item={item} sizes={SIZES} />
      </span>
      {!isNeutral && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-neutral-950/50 to-transparent" />
      )}
      <span className="absolute inset-x-0 top-0">{header}</span>
    </>
  ) : (
    // The shot fills the space below the header and runs off the right and
    // bottom edges, so it reads as intentionally cut off
    <span className="flex h-full flex-col">
      {header}
      <span className={cn("flex lg:min-h-0 lg:flex-1", PADDING_LEFT)}>
        <span className="relative w-full">
          <span
            className={cn(
              // bg-clip-padding lets the card show through the translucent rim
              "relative block aspect-(--media-aspect) w-full overflow-hidden rounded-tl-3xl border-t-6 border-l-6 bg-neutral-50 bg-clip-padding lg:absolute lg:inset-0 lg:aspect-auto",
              isNeutral ? "border-neutral-950/5" : "border-neutral-50/20",
              hoverScale,
            )}
          >
            <WallMedia item={item} sizes={SIZES} />
          </span>
        </span>
      </span>
    </span>
  );

  // Stacks at its natural height on mobile, the row sizes it on desktop
  const tileClassName = cn(
    "group @container relative inset-border block w-full overflow-hidden rounded-4xl",
    // Grid items with an aspect ratio don't stretch, so drop it on desktop
    product.bare && "aspect-(--media-aspect) lg:aspect-auto",
  );

  if (!link) {
    return (
      <div data-product className={tileClassName} style={tileStyle}>
        {content}
      </div>
    );
  }

  return (
    <a
      data-product
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        haptic.onClick();
        track("Product Visited", { product: product.name });
      }}
      onMouseEnter={haptic.onMouseEnter}
      onMouseLeave={haptic.onMouseLeave}
      className={cn(
        tileClassName,
        "focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
      )}
      style={tileStyle}
    >
      {content}
    </a>
  );
};

/**
 * The products, laid out like the UI/UX wall: tiles two to a row of equal
 * 4:3 halves, in the CMS's order. The island names the section, and the
 * products widget on home leads here.
 */
const ProductShowcase = () => {
  const { products } = useContent();
  const wallRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const rows = Array.from(
    { length: Math.ceil(products.length / 2) },
    (_, row) => products.slice(row * 2, row * 2 + 2),
  );

  // The tiles rise into place, one after another, as the section opens over
  // home. Loaded directly they've been on screen since the server's page,
  // and hiding them to rise would flash them, so like the UI/UX wall they're
  // just there
  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (
      !wall ||
      !scrollerOf(wall) ||
      !animationsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const tween = gsap.from(wall.querySelectorAll("[data-product]"), {
      y: 48,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.08,
      delay: 0.2,
      clearProps: "transform,opacity",
    });
    return () => {
      tween.kill();
    };
  }, [animationsEnabled]);

  return (
    <div className="px-3 pt-16 pb-3 md:px-4 lg:px-6">
      <div ref={wallRef} className="@container flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row[0].id}
            // Two equal 4:3 halves, like the wall's double row
            className="flex flex-col gap-3 lg:grid lg:h-(--block-height) lg:grid-cols-2"
            style={
              {
                "--block-height": "calc((100cqw - 12px) / 2 * 0.75)",
              } as CSSProperties
            }
          >
            {row.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductShowcase;
