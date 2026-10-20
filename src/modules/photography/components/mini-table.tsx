"use client";

import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { useThreeD } from "~/modules/core/hooks/use-three-d";
import Loupe from "~/modules/photography/components/loupe";
import PrintCard from "~/modules/photography/components/print-card";
import { canDrawLoupe } from "~/modules/photography/utils/loupe-glass";
import {
  getDragBounds,
  type Print,
  type Size,
  scatterLayout,
} from "~/modules/photography/utils/print-layouts";
import cn from "~/utils/cn";
import { scrollerOf } from "~/utils/footer";

gsap.registerPlugin(Draggable, InertiaPlugin);

const ROWS = 2;
const BASES_TALL = 3;

// How much of the frame shows before the prints are dropped onto it
const SEEN_AT = 0.4;

// The first prints, in the CMS's order: enough to cover the frame with some
// left to drag to. The rest are on the photography page
const PRINTS = 16;

const IMAGE_SIZES = "160px";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  prints: Print[];
}

const MiniTable = ({ prints: all }: Props) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const draggableRef = useRef<Draggable | null>(null);
  const hasEntered = useRef(false);

  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [frame, setFrame] = useState<Size | null>(null);
  const [isNear, setIsNear] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isSeen, setIsSeen] = useState(false);
  const [canPan, setCanPan] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [canLoupe, setCanLoupe] = useState(true);
  const isThreeD = useThreeD();
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  const prints = useMemo(() => all.slice(0, PRINTS), [all]);
  const numbers = useMemo(() => prints.map((_, index) => index + 1), [prints]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () =>
      setFrame((current) => {
        const next = { width: stage.clientWidth, height: stage.clientHeight };
        return current &&
          current.width === next.width &&
          current.height === next.height
          ? current
          : next;
      });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNear(true);
        near.disconnect();
      },
      { root: scrollerOf(stage), rootMargin: "100% 0px" },
    );
    const inView = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.intersectionRatio >= SEEN_AT) setIsSeen(true);
      },
      { threshold: [0, SEEN_AT] },
    );
    near.observe(stage);
    inView.observe(stage);
    return () => {
      near.disconnect();
      inView.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canDrawLoupe()) setCanLoupe(false);
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world || !frame || !isNear) return;

    const cards = cardRefs.current.filter(
      (card): card is HTMLButtonElement => card !== null,
    );
    const motion = animationsEnabled && !prefersReducedMotion();
    const layout = scatterLayout(
      prints,
      frame.height / BASES_TALL,
      frame,
      seed,
      Math.ceil(prints.length / ROWS),
    );
    const bounds = getDragBounds(layout, frame);

    gsap.killTweensOf(cards);
    if (hasEntered.current) {
      gsap.set(cards, { scale: 1, clearProps: "opacity,visibility" });
    }
    draggableRef.current?.kill();

    gsap.set(world, {
      width: layout.width,
      height: layout.height,
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    });
    cards.forEach((card, index) => {
      const { x, y, rotation, width, height } = layout.placements[index];
      gsap.set(card, {
        x,
        y,
        rotation,
        width,
        height,
        "--tilt": `${-rotation}deg`,
      });
    });

    draggableRef.current = Draggable.create(world, {
      type: "x",
      trigger: stage,
      bounds,
      inertia: motion,
      edgeResistance: 0.85,
      zIndexBoost: false,
      dragClickables: true,
      allowContextMenu: true,
      onDragStart: () => setHasDragged(true),
    })[0];
    setCanPan(bounds.minX < bounds.maxX);
  }, [prints, frame, isNear, seed, animationsEnabled]);

  useLayoutEffect(() => {
    if (!isNear || hasEntered.current) return;
    const cards = cardRefs.current.filter(
      (card): card is HTMLButtonElement => card !== null,
    );
    if (!animationsEnabled || prefersReducedMotion()) {
      hasEntered.current = true;
      gsap.set(cards, { clearProps: "opacity,visibility" });
      return;
    }
    if (!isSeen) {
      gsap.set(cards, { autoAlpha: 0 });
      return;
    }
    hasEntered.current = true;
    const rotations = cards.map(
      (card) => gsap.getProperty(card, "rotation") as number,
    );
    gsap.fromTo(
      cards,
      {
        autoAlpha: 0,
        scale: 1.1,
        rotation: (index) => rotations[index] + gsap.utils.random(-5, 5),
      },
      {
        autoAlpha: 1,
        scale: 1,
        rotation: (index) => rotations[index],
        duration: 0.9,
        ease: "power3.out",
        stagger: { each: 0.012, from: "random" },
        clearProps: "opacity,visibility",
      },
    );
  }, [isNear, isSeen, animationsEnabled]);

  useEffect(() => {
    const cards = cardRefs.current;
    return () => {
      draggableRef.current?.kill();
      for (const card of cards) if (card) gsap.killTweensOf(card);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      const draggable = draggableRef.current;
      const world = worldRef.current;
      if (
        !draggable ||
        !world ||
        event.ctrlKey ||
        draggable.minX === draggable.maxX ||
        Math.abs(event.deltaX) <= Math.abs(event.deltaY)
      )
        return;
      event.preventDefault();

      const unit = event.deltaMode === 1 ? 16 : 1;
      gsap.set(world, {
        x: gsap.utils.clamp(
          draggable.minX,
          draggable.maxX,
          draggable.x - event.deltaX * unit,
        ),
      });
      draggable.update();
      setHasDragged(true);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative isolate h-84 overflow-hidden rounded-[2.5rem] border border-neutral-950/10 bg-neutral-50 md:h-105"
    >
      {isNear && (
        <div ref={worldRef} className="absolute top-0 left-0">
          {prints.map((print, index) => (
            <PrintCard
              key={print.id}
              print={print}
              number={numbers[index]}
              view="table"
              sizes={IMAGE_SIZES}
              haptic={haptic}
              cardRef={(element) => {
                cardRefs.current[index] = element;
              }}
            />
          ))}
        </div>
      )}

      {/* Put down after the prints, off while it's out of view, and gone
          for this visit if the lens couldn't be made, or the GPU dropped it */}
      {canLoupe && isThreeD && (
        <Loupe
          stageRef={stageRef}
          cardRefs={cardRefs}
          prints={prints}
          numbers={numbers}
          isOn={isSeen && isInView}
          onLost={() => setCanLoupe(false)}
        />
      )}

      {canPan && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-4 left-1/2 z-20 h-6 -translate-x-1/2 rounded-[0.625rem] bg-neutral-950/50 px-2 text-neutral-50 text-xs leading-6 backdrop-blur-lg transition-opacity duration-500",
            hasDragged && "opacity-0",
          )}
        >
          Drag to look around
        </span>
      )}
    </div>
  );
};

export default MiniTable;
