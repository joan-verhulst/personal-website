"use client";

import { gsap } from "gsap";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useInView from "~/modules/about/hooks/use-in-view";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

// A word that does something under the pointer reads a shade darker, like
// the posts' strong words
const WORD = "text-neutral-950";

// The letters in a word, keyed by where they are
const letters = (text: string) => Array.from(text, (letter, at) => ({ letter, at }));

// How far the pointer goes before the next picture drops, in px
const TRAIL_SPACING = 32;

const thumbnail = (image: string) =>
  `/_next/image?url=${encodeURIComponent(image)}&w=256&q=75`;

/**
 * Pictures dropping off the pointer as it moves over the word, one after
 * another from the images: each pops up, tilted, then sinks and fades.
 */
export const Trail = ({ images, children }: { images: string[]; children: ReactNode }) => {
  const layerRef = useRef<HTMLSpanElement>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const nextRef = useRef(0);
  const isFetchedRef = useRef(false);
  const { animationsEnabled } = useAnimationPreference();
  const sources = useMemo(() => images.map(thumbnail), [images]);

  // Fetched as the pointer arrives, so the first ones don't drop in blank
  const handleEnter = () => {
    if (isFetchedRef.current || !animationsEnabled) return;
    isFetchedRef.current = true;
    for (const source of sources) {
      const picture = new Image();
      picture.src = source;
    }
  };

  const handleMove = (event: PointerEvent<HTMLSpanElement>) => {
    const layer = layerRef.current;
    if (!layer || event.pointerType !== "mouse" || !animationsEnabled) return;
    if (sources.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const last = lastRef.current;
    if (last && Math.hypot(x - last.x, y - last.y) < TRAIL_SPACING) return;
    lastRef.current = { x, y };

    const picture = document.createElement("img");
    picture.src = sources[nextRef.current % sources.length];
    nextRef.current += 1;
    picture.alt = "";
    picture.draggable = false;
    picture.className = "absolute aspect-16/10 w-24 max-w-none rounded-lg object-cover";
    picture.style.left = `${x}px`;
    picture.style.top = `${y}px`;
    layer.append(picture);

    const tilt = gsap.utils.random(-12, 12);
    gsap
      .timeline({ onComplete: () => picture.remove() })
      .fromTo(
        picture,
        { xPercent: -50, yPercent: -50, scale: 0.3, rotation: tilt, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
      )
      .to(
        picture,
        { y: 28, scale: 0.7, rotation: tilt * 1.6, opacity: 0, duration: 0.6, ease: "power2.in" },
        0.5,
      );
  };

  return (
    <span
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={() => {
        lastRef.current = null;
      }}
      className={cn(WORD, "relative")}
    >
      {children}
      <span ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />
    </span>
  );
};

// Around the colour wheel, one per letter of "color"
const TINTS = [
  "var(--color-error-400)",
  "var(--color-warning-500)",
  "var(--color-success-500)",
  "var(--color-primary-500)",
  "oklch(0.6 0.16 300)",
];

/** Hovered, the word's letters each take a colour, one after another. */
export const Tint = ({ children: text }: { children: string }) => (
  <span className={cn(WORD, "group/tint")}>
    {letters(text).map(({ letter, at }) => (
      <span
        key={at}
        className="transition-colors duration-300 group-hover/tint:text-(--tint)"
        style={{ "--tint": TINTS[at % TINTS.length], transitionDelay: `${at * 45}ms` } as CSSProperties}
      >
        {letter}
      </span>
    ))}
  </span>
);

/**
 * Hovered, the word's letters hop, one after another. Slow, they rise and
 * sway back down at half speed.
 */
export const Hop = ({ children: text, isSlow = false }: { children: string; isSlow?: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<gsap.core.Tween | null>(null);
  const { animationsEnabled } = useAnimationPreference();

  const hop = () => {
    const word = ref.current;
    if (!word || !animationsEnabled || waveRef.current?.isActive()) return;
    const size = Number.parseFloat(getComputedStyle(word).fontSize);
    const hopping = word.querySelectorAll("[data-letter]");
    waveRef.current = isSlow
      ? gsap.to(hopping, {
          y: -0.16 * size,
          rotation: gsap.utils.wrap([-4, 4]),
          duration: 0.8,
          ease: "sine.inOut",
          stagger: { each: 0.09, yoyo: true, repeat: 1 },
        })
      : gsap.to(hopping, {
          y: -0.3 * size,
          duration: 0.18,
          ease: "sine.out",
          stagger: { each: 0.035, yoyo: true, repeat: 1 },
        });
  };

  useEffect(() => () => void waveRef.current?.kill(), []);

  return (
    <span ref={ref} onPointerEnter={hop} className={WORD}>
      {letters(text).map(({ letter, at }) =>
        letter === " " ? (
          " "
        ) : (
          <span key={at} data-letter className="inline-block">
            {letter}
          </span>
        ),
      )}
    </span>
  );
};

// How long the eyes stay once the pointer's gone, in ms, and how far the
// pupils look, in px
const EYES_LINGER = 600;
const LOOK = 2.5;

/**
 * Hovered, a pair of eyes pops up over the words and watches the pointer,
 * blinking now and then.
 */
export const Eyes = ({ children }: { children: ReactNode }) => {
  const eyesRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setOpen] = useState(false);
  const { animationsEnabled } = useAnimationPreference();

  const open = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    setOpen(true);
  };

  const close = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpen(false), EYES_LINGER);
  };

  useEffect(
    () => () => {
      if (closeRef.current) clearTimeout(closeRef.current);
    },
    [],
  );

  // While open, they follow the pointer and blink
  useEffect(() => {
    const eyes = eyesRef.current;
    if (!isOpen || !eyes) return;
    const whites = Array.from(eyes.children);

    const look = (event: globalThis.PointerEvent) => {
      for (const white of whites) {
        const rect = white.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(distance / 24, 1) * LOOK;
        gsap.to(white.firstElementChild, {
          x: (dx / distance) * reach,
          y: (dy / distance) * reach,
          duration: 0.15,
          overwrite: true,
        });
      }
    };
    window.addEventListener("pointermove", look);

    let blinkTimer: ReturnType<typeof setTimeout>;
    const blink = () => {
      blinkTimer = setTimeout(() => {
        gsap.to(whites, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 });
        blink();
      }, gsap.utils.random(1600, 3600));
    };
    if (animationsEnabled) blink();

    return () => {
      window.removeEventListener("pointermove", look);
      clearTimeout(blinkTimer);
    };
  }, [isOpen, animationsEnabled]);

  return (
    <span onPointerEnter={open} onPointerLeave={close} className={cn(WORD, "relative")}>
      {children}
      <span
        ref={eyesRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 mb-0.5 flex origin-bottom -translate-x-1/2 gap-0.5",
          animationsEnabled &&
            "transition-[scale,opacity] duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      >
        <span className="flex size-3.5 items-center justify-center rounded-full bg-white ring-1 ring-neutral-950/15">
          <span className="size-1.5 rounded-full bg-neutral-950" />
        </span>
        <span className="flex size-3.5 items-center justify-center rounded-full bg-white ring-1 ring-neutral-950/15">
          <span className="size-1.5 rounded-full bg-neutral-950" />
        </span>
      </span>
    </span>
  );
};

// Pixels thrown off the words when hovered, the least time between two
// bursts in ms, and their colours
const PIXELS = 14;
const PIXELS_EVERY = 700;
const PIXEL_COLORS = ["bg-primary-500", "bg-primary-300", "bg-neutral-950"];

/**
 * Hovered, the words throw off a few square pixels, which hop away a step
 * at a time and blink out, like a low frame rate.
 */
export const Pixels = ({ children }: { children: ReactNode }) => {
  const layerRef = useRef<HTMLSpanElement>(null);
  const lastRef = useRef(0);
  const { animationsEnabled } = useAnimationPreference();

  const burst = () => {
    const layer = layerRef.current;
    const now = performance.now();
    if (!layer || !animationsEnabled || now - lastRef.current < PIXELS_EVERY) return;
    lastRef.current = now;
    const { width, height } = layer.getBoundingClientRect();
    for (let index = 0; index < PIXELS; index++) {
      const pixel = document.createElement("span");
      pixel.className = `absolute size-1 ${PIXEL_COLORS[index % PIXEL_COLORS.length]}`;
      const x = gsap.utils.random(0, width);
      const y = gsap.utils.random(0, height);
      pixel.style.left = `${x}px`;
      pixel.style.top = `${y}px`;
      layer.append(pixel);
      // Out from the middle of the words, kept on a 2 px grid
      const angle = Math.atan2(y - height / 2, x - width / 2) + gsap.utils.random(-0.4, 0.4);
      const reach = gsap.utils.random(10, 26);
      gsap.to(pixel, {
        x: Math.round((Math.cos(angle) * reach) / 2) * 2,
        y: Math.round((Math.sin(angle) * reach - 6) / 2) * 2,
        opacity: 0,
        duration: gsap.utils.random(0.5, 0.8),
        ease: "steps(5)",
        onComplete: () => pixel.remove(),
      });
    }
  };

  return (
    <span onPointerEnter={burst} className={cn(WORD, "relative whitespace-nowrap")}>
      {children}
      <span ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />
    </span>
  );
};

/** A line scribbled under the words, once they're on screen. */
export const Scribble = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref);
  const { animationsEnabled } = useAnimationPreference();
  const isShown = isInView || !animationsEnabled;

  return (
    <span ref={ref} className="relative whitespace-nowrap">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 10"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-1.5 left-0 h-2.5 w-full overflow-visible text-primary-500/70"
      >
        <path
          d="M2 6.5C20 3 36 8.5 56 5.5S96 3 118 6"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: isShown ? 0 : 1,
            transition: "stroke-dashoffset 1s cubic-bezier(0.65, 0, 0.35, 1) 0.4s",
          }}
        />
      </svg>
    </span>
  );
};

/**
 * A highlighter swept along the words, line by line, once they're on
 * screen.
 */
export const Highlight = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref);
  const { animationsEnabled } = useAnimationPreference();
  const isShown = isInView || !animationsEnabled;

  return (
    <span
      ref={ref}
      className="bg-[linear-gradient(transparent_58%,var(--color-warning-100)_58%,var(--color-warning-100)_94%,transparent_94%)] bg-no-repeat text-neutral-950 transition-[background-size] delay-300 duration-1200 ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{ backgroundSize: isShown ? "100% 100%" : "0% 100%" }}
    >
      {children}
    </span>
  );
};
