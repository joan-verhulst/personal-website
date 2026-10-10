"use client";

import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import {
  type FocusEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import IslandControls from "~components/layout/island/island-controls";
import ImagePopover from "~/modules/core/components/image-popover";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import PrintCard, {
  type PhotoView,
} from "~/modules/photography/components/print-card";
import ViewSwitcher from "~/modules/photography/components/view-switcher";
import {
  getDragBounds,
  getPrintBase,
  getTableImageSizes,
  type Print,
  type Size,
  scatterLayout,
} from "~/modules/photography/utils/print-layouts";
import cn from "~/utils/cn";
import { track } from "~/utils/eyes";
import { isFooterClosed, openFooter } from "~/utils/footer";

gsap.registerPlugin(Draggable, Flip, InertiaPlugin);

const VIEWS: PhotoView[] = ["table", "grid"];
const VIEW_STORAGE_KEY = "photography-view";

// Room a focused print keeps from the frame's edges
const FOCUS_INSET = 24;

// How far past its bottom edge the table has to be pulled to open the
// footer. Its edge resistance lets it follow 15% of the finger, so this is
// a pull of about 160px
const PULL_TO_FOOTER = 24;

// Photo width in the grid below: 2, 3 or 4 columns, tiles padded 6%, capped at 120rem wide
const GRID_IMAGE_SIZES =
  "(min-width: 1920px) 390px, (min-width: 1536px) 21vw, (min-width: 768px) 28vw, 42vw";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  prints: Print[];
}

/**
 * The same prints two ways: scattered on a table you drag around, or in a
 * regular grid. Switching flies every print from where it is to its new place.
 */
const PhotoTable = ({ prints }: Props) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const draggableRef = useRef<Draggable | null>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const wasDragged = useRef(false);
  const hasEntered = useRef(false);

  const [view, setView] = useState<PhotoView>("table");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  // The order the prints are laid out in, as indexes into `prints`. They keep
  // the order they come in until the grid is shuffled
  const [order, setOrder] = useState<number[] | null>(null);
  const [viewport, setViewport] = useState<Size | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { animationsEnabled } = useAnimationPreference();
  // One instance for every print, each instance opens its own AudioContext
  const haptic = useHapticSound();

  const isTable = view === "table";
  const ordered = useMemo(
    () => order?.map((index) => prints[index]) ?? prints,
    [order, prints],
  );

  // ── Viewport and saved view ─────────────────────────────────────────────────

  // Layout effect, so a saved grid view applies before the first paint
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY) as PhotoView | null;
      if (saved && VIEWS.includes(saved)) setView(saved);
    } catch {}

    const measure = () =>
      setViewport((current) => {
        const next = { width: window.innerWidth, height: window.innerHeight };
        // Mobile toolbars change the height a little, not worth a new layout
        if (
          current &&
          current.width === next.width &&
          Math.abs(current.height - next.height) < 120
        )
          return current;
        return next;
      });

    measure();
    let timer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 150);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ── Layout ──────────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world || !viewport) return;

    const cards = cardRefs.current.filter(
      (card): card is HTMLButtonElement => card !== null,
    );
    const motion = animationsEnabled && !prefersReducedMotion();

    // Prints are sized to the screen, scattered and bounded within the frame
    const frame = { width: stage.clientWidth, height: stage.clientHeight };
    const layout = isTable
      ? scatterLayout(ordered, getPrintBase(viewport), frame, seed)
      : null;

    // Stop whatever is still flying, including the leftovers of an interrupted flip
    Flip.killFlipsOf(cards);
    gsap.killTweensOf(cards);
    gsap.set(cards, { clearProps: "position,top,left" });
    draggableRef.current?.kill();
    draggableRef.current = null;

    if (!layout) {
      // Grid: back to normal flow
      gsap.set(world, { clearProps: "transform,width,height" });
      gsap.set(cards, { clearProps: "transform,width,height,--tilt" });
    } else {
      // Opened from the home screen, the page scrolls inside the layer over it
      const scroller = stage.closest("[data-section-scroll]");
      if (scroller) scroller.scrollTop = 0;
      else if (window.scrollY > 0) window.scrollTo(0, 0);
      // The grid scrolls the frame, the table pans inside it instead
      stage.scrollTop = 0;

      const bounds = getDragBounds(layout, frame);
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
        type: "x,y",
        trigger: stage,
        bounds,
        inertia: motion,
        edgeResistance: 0.85,
        // Raising the z-index on press would lift the table over the popover
        zIndexBoost: false,
        dragClickables: true,
        allowContextMenu: true,
        onDragStart: () => {
          wasDragged.current = true;
          setHasDragged(true);
        },
        // The click that ends a drag fires before this, so it's still ignored
        onDragEnd: function (this: Draggable) {
          setTimeout(() => {
            wasDragged.current = false;
          }, 0);
          // A pull well past the bottom edge opens the footer, which touch
          // can't scroll to: the table takes every drag
          if (this.minY - this.y > PULL_TO_FOOTER) openFooter(stage);
        },
      })[0];
    }

    if (flipState.current) {
      if (motion) {
        Flip.from(flipState.current, {
          duration: 0.9,
          ease: "power3.inOut",
          absolute: true,
          scale: false,
          stagger: 0.008,
        });
      }
      flipState.current = null;
    } else if (!hasEntered.current && motion) {
      if (layout) {
        // Dropped onto the table: a little lifted and turned, then settling in place
        gsap.from(cards, {
          scale: 1.1,
          rotation: (index) =>
            layout.placements[index].rotation + gsap.utils.random(-5, 5),
          duration: 0.9,
          ease: "power3.out",
          stagger: { each: 0.012, from: "random" },
          delay: 0.3,
        });
      } else {
        gsap.from(cards, {
          y: 32,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.02,
          delay: 0.3,
          clearProps: "transform",
        });
      }
    }
    hasEntered.current = true;
  }, [ordered, isTable, seed, viewport, animationsEnabled]);

  useEffect(() => {
    const cards = cardRefs.current;
    return () => {
      draggableRef.current?.kill();
      for (const card of cards) if (card) gsap.killTweensOf(card);
    };
  }, []);

  // Trackpads and mouse wheels pan the table too
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isTable) return;

    const handleWheel = (event: WheelEvent) => {
      const draggable = draggableRef.current;
      const world = worldRef.current;
      // Leave pinch zoom to the browser
      if (!draggable || !world || event.ctrlKey) return;
      // Left to the footer: down once the table's bottom edge is in view,
      // and anything while the footer is open or being pulled
      const isDown =
        event.deltaY > 0 && Math.abs(event.deltaY) > Math.abs(event.deltaX);
      if (!isFooterClosed(stage) || (isDown && draggable.y <= draggable.minY)) {
        return;
      }
      event.preventDefault();

      // Some mice report lines instead of pixels
      const unit = event.deltaMode === 1 ? 16 : 1;
      gsap.set(world, {
        x: gsap.utils.clamp(
          draggable.minX,
          draggable.maxX,
          draggable.x - event.deltaX * unit,
        ),
        y: gsap.utils.clamp(
          draggable.minY,
          draggable.maxY,
          draggable.y - event.deltaY * unit,
        ),
      });
      draggable.update();
      setHasDragged(true);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [isTable]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  // Records where every print is, so the next layout can fly them from there
  const captureForFlip = () => {
    if (!animationsEnabled || prefersReducedMotion()) return;
    flipState.current = Flip.getState(
      cardRefs.current.filter(Boolean) as HTMLButtonElement[],
      { props: "backgroundColor,padding,borderRadius" },
    );
  };

  const changeView = (next: PhotoView) => {
    if (next === view) return;
    captureForFlip();
    setView(next);
    track("Photo View Changed", { view: next });
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {}
  };

  // The table scatters the prints anew, the grid deals them in a new order
  const shuffle = () => {
    captureForFlip();
    if (isTable) setSeed((current) => current + 1);
    else setOrder(gsap.utils.shuffle(prints.map((_, index) => index)));
  };

  const openPrint = (index: number) => {
    if (wasDragged.current) return;
    haptic.onClick();
    setActiveIndex(index);
    setIsPopoverOpen(true);
    track("Photo Opened", { photo: prints[index].title });
  };

  // Keyboard focus pans a print hidden past the frame's edge into view
  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    const draggable = draggableRef.current;
    const world = worldRef.current;
    const stage = stageRef.current;
    if (
      !draggable ||
      !world ||
      !stage ||
      !event.currentTarget.matches(":focus-visible")
    )
      return;

    const rect = event.currentTarget.getBoundingClientRect();
    const frame = stage.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (rect.left < frame.left + FOCUS_INSET)
      dx = frame.left + FOCUS_INSET - rect.left;
    else if (rect.right > frame.right - FOCUS_INSET)
      dx = frame.right - FOCUS_INSET - rect.right;
    if (rect.top < frame.top + FOCUS_INSET)
      dy = frame.top + FOCUS_INSET - rect.top;
    else if (rect.bottom > frame.bottom - FOCUS_INSET)
      dy = frame.bottom - FOCUS_INSET - rect.bottom;
    if (dx === 0 && dy === 0) return;

    gsap.to(world, {
      x: gsap.utils.clamp(draggable.minX, draggable.maxX, draggable.x + dx),
      y: gsap.utils.clamp(draggable.minY, draggable.maxY, draggable.y + dy),
      duration: animationsEnabled ? 0.5 : 0,
      ease: "power2.out",
      onUpdate: () => {
        draggable.update();
      },
    });
  };

  return (
    <>
      {/* Both views sit in a frame, inset evenly. The grid scrolls inside it */}
      <div className="h-svh p-4 md:p-8 lg:p-12">
        <div
          ref={stageRef}
          className={cn(
            "relative isolate h-full rounded-[2.5rem] border border-neutral-950/10",
            isTable
              ? "touch-none overflow-hidden"
              : "overflow-y-auto overscroll-contain",
          )}
          // The table takes every touch, so a pull past its edge opens the
          // footer instead, see onDragEnd
          data-gestures={isTable || undefined}
        >
          <div
            ref={worldRef}
            className={cn(
              isTable
                ? "absolute top-0 left-0"
                : "mx-auto grid max-w-480 grid-cols-2 gap-3 p-3 md:grid-cols-3 md:gap-4 md:p-4 2xl:grid-cols-4",
            )}
          >
            {ordered.map((print, index) => (
              <PrintCard
                key={print.id}
                print={print}
                // Each print keeps its number, wherever it's dealt
                number={(order?.[index] ?? index) + 1}
                view={view}
                sizes={isTable ? getTableImageSizes(print) : GRID_IMAGE_SIZES}
                haptic={haptic}
                cardRef={(element) => {
                  cardRefs.current[index] = element;
                }}
                onOpen={() => openPrint(index)}
                onFocus={handleFocus}
              />
            ))}
          </div>

          {isTable && (
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
      </div>

      <IslandControls>
        <ViewSwitcher
          view={view}
          haptic={haptic}
          onChange={changeView}
          onShuffle={shuffle}
        />
      </IslandControls>

      <ImagePopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        items={ordered}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  );
};

export default PhotoTable;
