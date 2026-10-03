import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import IslandCounter from "~components/layout/island/island-counter";
import { getSections, type Section } from "~/data/sections";
import { widgets } from "~/data/widgets";
import { useContent } from "~/modules/content/components/content-provider";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";

// The cursor stays this far from the ends of the scale, in percent
const EDGE = 12;
// Movement before a press counts as a drag, in pixels
const DRAG_THRESHOLD = 4;

// Home first, then the sections, spread evenly over the scale
const getStops = (sections: Section[]) =>
  [
  { href: "/", label: "Home", count: Object.keys(widgets).length },
  ...sections.map(({ href, short, count }) => ({ href, label: short, count })),
].map((stop, index, all) => ({
  ...stop,
  x: EDGE + (index * (100 - EDGE * 2)) / (all.length - 1),
}));

type Stop = ReturnType<typeof getStops>[number];

const getNearest = (stops: Stop[], percent: number) =>
  stops.reduce(
    (best, stop, index) =>
      Math.abs(stop.x - percent) < Math.abs(stops[best].x - percent)
        ? index
        : best,
    0,
  );

const TICKS = {
  background: [
    "repeating-linear-gradient(90deg, rgb(250 249 249 / 0.3) 0 1px, transparent 1px 8px) bottom / 100% 6px no-repeat",
    "repeating-linear-gradient(90deg, rgb(250 249 249 / 0.9) 0 1px, transparent 1px 40px) bottom / 100% 10px no-repeat",
  ].join(", "),
};

interface Props {
  // The page that's open, "/" for the home screen
  pathname: string;
  onVisit: (href: string) => void;
}

/**
 * The scale of a tuner, with the pages as stops. Click a stop, or drag the
 * cursor along: it snaps to the nearest stop when let go.
 */
const IslandDial = ({ pathname, onVisit }: Props) => {
  const haptic = useHapticSound();
  const content = useContent();
  const stops = useMemo(() => getStops(getSections(content)), [content]);
  const scaleRef = useRef<HTMLDivElement>(null);
  const justDragged = useRef(false);
  // Where the cursor is while it's dragged, in percent
  const [dragX, setDragX] = useState<number | null>(null);
  // The stop the cursor is on its way to, until the page is there
  const [over, setOver] = useState<number | null>(null);

  const current = Math.max(
    0,
    stops.findIndex(({ href }) => href === pathname),
  );
  const shown = over ?? current;

  // The page arrived, or never will
  useEffect(() => {
    if (over === null || dragX !== null) return;
    if (over === current) {
      setOver(null);
      return;
    }
    const timer = setTimeout(() => setOver(null), 1500);
    return () => clearTimeout(timer);
  }, [over, current, dragX]);

  const handlePointerDown = (event: ReactPointerEvent) => {
    const scale = scaleRef.current;
    if (!scale) return;

    const startX = event.clientX;
    const rect = scale.getBoundingClientRect();
    let moved = false;
    let target = current;

    const handleMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - startX) < DRAG_THRESHOLD) return;
      moved = true;

      const percent = Math.min(
        100 - EDGE / 2,
        Math.max(EDGE / 2, ((move.clientX - rect.left) / rect.width) * 100),
      );
      setDragX(percent);

      const nearest = getNearest(stops, percent);
      if (nearest !== target) {
        target = nearest;
        setOver(nearest);
        // A tick for every stop it passes
        haptic.onMouseEnter();
      }
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (!moved) return;

      // The click that follows a drag isn't a choice of stop
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 0);

      setDragX(null);
      setOver(target);
      if (target !== current) onVisit(stops[target].href);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  return (
    <div className="flex size-full items-stretch gap-3 px-3.5">
      <div
        ref={scaleRef}
        onPointerDown={handlePointerDown}
        className={cn(
          "relative min-w-0 flex-1 touch-none select-none",
          dragX === null ? "cursor-grab" : "cursor-grabbing",
        )}
      >
        <div className="absolute inset-0" style={TICKS} />

        {stops.map((stop, index) => (
          <button
            key={stop.href}
            type="button"
            aria-current={index === current ? "page" : undefined}
            onClick={() => {
              if (justDragged.current) return;
              setOver(index);
              onVisit(stop.href);
            }}
            onMouseEnter={haptic.onMouseEnter}
            className={cn(
              "absolute top-[9px] -translate-x-1/2 cursor-pointer whitespace-nowrap px-1.5 py-0.5 text-[10.5px] uppercase tracking-wider transition-colors",
              index === shown
                ? "font-medium text-neutral-50"
                : "text-neutral-50/60 hover:text-neutral-50",
            )}
            style={{ left: `${stop.x}%` }}
          >
            {stop.label}
          </button>
        ))}

        {/* The cursor of a slide rule: a glass window with a hairline */}
        <div
          className={cn(
            "pointer-events-none absolute top-[5px] bottom-0 -ml-[29px] w-[58px] rounded-t-[7px] border border-neutral-50/30 border-b-0 bg-neutral-50/15",
            dragX === null &&
              "transition-[left] duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
          )}
          style={{ left: `${dragX ?? stops[shown].x}%` }}
        >
          <span className="absolute bottom-0 left-1/2 h-[13px] w-[1.5px] bg-primary" />
        </div>
      </div>

      <IslandCounter value={stops[shown].count} className="self-center" />
    </div>
  );
};

export default IslandDial;
