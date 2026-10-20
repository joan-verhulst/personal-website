"use client";

import { type RefObject, useEffect, useState } from "react";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";
import { scrollerOf } from "~/utils/footer";

const STEM = { shown: 18, active: 14, near: 10, rest: 6 };
const SPRING =
  "duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none";

interface Section {
  label: string;
  node: HTMLElement;
}

/** The post's sections beside it, with the one being read marked. */
const PostIndex = ({ target }: { target: RefObject<HTMLElement | null> }) => {
  const haptic = useHapticSound();
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState(0);
  const [pointed, setPointed] = useState<number | null>(null);

  useEffect(() => {
    const prose = target.current;
    if (!prose) return;
    const headings = [...prose.querySelectorAll<HTMLElement>(":scope > h2")];
    setSections([
      { label: "Intro", node: prose },
      ...headings.map((node) => ({ label: node.textContent ?? "", node })),
    ]);

    // The page scrolls itself, unless the post is open in a section layer.
    const scroller = scrollerOf(prose);
    const scrollTarget = scroller ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = scroller?.getBoundingClientRect().top ?? 0;
      const height = scroller?.clientHeight ?? window.innerHeight;
      const line = top + height / 3;
      // Before the first heading, the intro is being read.
      setActive(
        headings.findLastIndex(
          (node) => node.getBoundingClientRect().top <= line,
        ) + 1,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [target]);

  if (sections.length < 2) return null;

  const shown = pointed ?? active;

  return (
    <nav
      aria-label="Sections"
      className="flex w-52 flex-col items-start"
      onMouseLeave={() => setPointed(null)}
    >
      {sections.map((section, index) => {
        const isNear = Math.abs(index - shown) === 1;
        const width =
          index === shown
            ? STEM.shown
            : index === active
              ? STEM.active
              : isNear
                ? STEM.near
                : STEM.rest;

        return (
          <button
            key={section.label}
            type="button"
            aria-current={index === active ? "location" : undefined}
            className="flex h-8 max-w-full cursor-pointer items-center gap-3 text-left text-sm"
            onMouseEnter={() => {
              haptic.onMouseEnter();
              setPointed(index);
            }}
            onFocus={() => setPointed(index)}
            onBlur={() => setPointed(null)}
            onClick={() => {
              haptic.onClick();
              section.node.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="flex w-4.5 shrink-0">
              <span
                className={cn(
                  "h-px rounded-full transition-[width,background-color]",
                  SPRING,
                  index === active
                    ? "bg-primary"
                    : index === shown
                      ? "bg-neutral-950"
                      : isNear
                        ? "bg-neutral-950/40"
                        : "bg-neutral-950/20",
                )}
                style={{ width }}
              />
            </span>
            <span
              className={cn(
                "truncate transition-[color,translate]",
                SPRING,
                index === shown && "translate-x-0.5",
                index === shown || index === active
                  ? "text-neutral-950"
                  : isNear
                    ? "text-neutral-950/50"
                    : "text-neutral-950/30",
              )}
            >
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default PostIndex;
