"use client";

import { gsap } from "gsap";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import FlowerBurst from "~/modules/about/components/flower-burst";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

const WORD = "text-neutral-950";

const letters = (text: string) => Array.from(text, (letter, at) => ({ letter, at }));

const thumbnail = (image: string, width = 384) =>
  `/_next/image?url=${encodeURIComponent(image)}&w=${width}&q=75`;

const TINTS = [
  "var(--color-error-400)",
  "var(--color-warning-500)",
  "var(--color-success-500)",
  "var(--color-primary-500)",
  "oklch(0.6 0.16 300)",
];

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

export const Hop = ({ children: text }: { children: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<gsap.core.Tween | null>(null);
  const { animationsEnabled } = useAnimationPreference();

  const hop = () => {
    const word = ref.current;
    if (!word || !animationsEnabled || waveRef.current?.isActive()) return;
    const size = Number.parseFloat(getComputedStyle(word).fontSize);
    const hopping = word.querySelectorAll("[data-letter]");
    waveRef.current = gsap.to(hopping, {
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

const PEEK_FOLLOW = 0.35;
// The hover cards are 11rem wide; the bloom is sized as if they were this wide.
// Wide cards are 18rem and scale it along, so the flowers stay the same size.
const PEEK_BLOOM = 420;

const seedOf = (text: string) => Array.from(text).reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) | 0, 7);

export const Peek = ({
  image,
  caption,
  wide,
  children,
}: {
  image: string;
  caption: string;
  // A 16:9 card for screens, rather than a portrait print
  wide?: boolean;
  children: ReactNode;
}) => {
  const wordRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setOpen] = useState(false);
  const { animationsEnabled } = useAnimationPreference();

  const follow =(event: PointerEvent<HTMLSpanElement>) => {
    const word = wordRef.current;
    const card = cardRef.current;
    if (!word || !card || event.pointerType !== "mouse" || !animationsEnabled) return;
    const rect = word.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    gsap.to(card, {
      x: dx * PEEK_FOLLOW,
      y: (event.clientY - (rect.top + rect.height / 2)) * PEEK_FOLLOW,
      rotation: gsap.utils.clamp(-8, 8, dx * 0.12),
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  const settle = () => {
    setOpen(false);
    if (cardRef.current) gsap.to(cardRef.current, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: "power3.out" });
  };

  return (
    <span
      ref={wordRef}
      onPointerEnter={() => setOpen(true)}
      onPointerMove={follow}
      onPointerLeave={settle}
      className={cn(WORD, "group/peek relative whitespace-nowrap")}
    >
      {children}
      <span
        ref={cardRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-full left-1/2 z-10 mt-4",
          wide ? "-ml-36 w-72" : "-ml-22 w-44",
        )}
      >
        <span
          className={cn(
            "block origin-top -rotate-3 scale-0 rounded-2xl bg-white px-1.5 pt-1.5 opacity-0 outline outline-neutral-950/10 -outline-offset-1 group-hover/peek:scale-100 group-hover/peek:opacity-100",
            animationsEnabled &&
              "transition-[scale,opacity] duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          )}
        >
          <FlowerBurst shape="frame" play={isOpen} fullWidth={wide ? (PEEK_BLOOM * 72) / 44 : PEEK_BLOOM} seed={seedOf(caption)}>
            {/* biome-ignore lint/performance/noImgElement: a small hover preview */}
            <img
              src={thumbnail(image, wide ? 640 : 384)}
              alt=""
              className={cn("block w-full rounded-[10px] object-cover", wide ? "aspect-video" : "aspect-4/5")}
            />
            <span className="block h-6 truncate text-left text-[0.625rem] text-neutral-500 leading-6">{caption}</span>
          </FlowerBurst>
        </span>
      </span>
    </span>
  );
};

const CHIP = "mx-1.5 inline-block h-[1.05em] w-[1.7em] -translate-y-[0.08em] rounded-[0.3em] align-middle outline outline-neutral-950/10 -outline-offset-1";

export const Chip = ({ image }: { image: string }) => (
  <span aria-hidden className={cn(CHIP, "overflow-hidden bg-neutral-200")}>
    {/* biome-ignore lint/performance/noImgElement: a tiny inline thumbnail */}
    <img src={thumbnail(image)} alt="" draggable={false} className="size-full object-cover" />
  </span>
);

export const Avatar = ({ image }: { image: string }) => (
  <span
    aria-hidden
    className="mx-1.5 inline-block size-[0.9em] -translate-y-[0.08em] overflow-hidden rounded-full align-middle outline outline-neutral-950/10 -outline-offset-1"
  >
    {/* biome-ignore lint/performance/noImgElement: a tiny inline thumbnail */}
    <img src={thumbnail(image)} alt="" draggable={false} className="size-full object-cover" />
  </span>
);

export const Flag = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 9 9"
    className="mx-1.5 inline-block size-[0.9em] -translate-y-[0.08em] overflow-hidden rounded-full align-middle outline outline-neutral-950/10 -outline-offset-1"
  >
    <rect width="9" height="3" fill="#AE1C28" />
    <rect y="3" width="9" height="3" fill="#fff" />
    <rect y="6" width="9" height="3" fill="#21468B" />
  </svg>
);
