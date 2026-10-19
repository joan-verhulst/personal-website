"use client";

import { gsap } from "gsap";
import { FastForward } from "lucide-react";
import Image from "next/image";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { handleOf, type RoomHandle } from "~/modules/about/room/handle";
import { copyLayout, savedLayout } from "~/modules/about/room/layout";
import type { Hotspot } from "~/modules/about/room/parts";
import type { Room as RoomScene, RoomView } from "~/modules/about/room/room-scene";
import { homeClockAt } from "~/modules/about/room/schedule";
import { stillPhaseAt, stillUrl } from "~/modules/about/room/stills";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { holdGraphics, whenGraphicsFree } from "~/modules/core/utils/gpu-busy";
import { getState, subscribe } from "~/utils/app-layer";
import cn from "~/utils/cn";

// How long a played day takes
const PLAY_SECONDS = 16;
const DAY = 86_400_000;
// A press that moves more than this is the page scrolling, not a click
const DRAG_FROM = 6;
// How far along the room is once its code has come: the rest is its
// surfaces being painted and its light baked, which the room reports
const LOADED_SHARE = 0.1;
// How long after the room shows its loading picture is let go of: the
// room's fade, and a little
const STILL_AFTER = 700;

interface Props {
  // Shown where the room can't be drawn
  fallback?: string;
  // What hangs in the frames on its walls, as image addresses
  pictures: string[];
  // Something in the room was clicked
  onPick: (target: Hotspot["target"]) => void;
}

interface Press {
  id: number;
  x: number;
  y: number;
}

// Being painted, on screen, or not possible here
type Mode = "building" | "ready" | "failed";

// Settles once the section has finished opening over the home screen, if
// it's opening, and the page then has a quiet moment
const whenCalm = () =>
  new Promise<void>((resolve) => {
    const quietly = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 1000 });
      else setTimeout(resolve, 200);
    };
    if (getState().phase !== "opening") {
      quietly();
      return;
    }
    const unsubscribe = subscribe(() => {
      if (getState().phase === "opening") return;
      unsubscribe();
      quietly();
    });
  });

// Lets go of a room once the section has finished closing and the page has
// a quiet moment
const destroyWhenCalm = (room: RoomHandle) => {
  const quietly = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => room.destroy(), { timeout: 2000 });
    else setTimeout(() => room.destroy(), 300);
  };
  if (getState().phase !== "closing") {
    quietly();
    return;
  }
  const unsubscribe = subscribe(() => {
    if (getState().phase === "closing") return;
    unsubscribe();
    quietly();
  });
};

// How large the room shows, for the room, which may be drawn in a worker
// where it can't measure the page itself
const viewOf = (host: HTMLElement): RoomView => ({
  width: host.clientWidth,
  height: host.clientHeight,
  devicePixelRatio: window.devicePixelRatio || 1,
});

const prefersLessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Locally, /about?tune opens the room's tuner, see room/tuner.ts. Never in
// the built site
const wantsTuner = () =>
  process.env.NODE_ENV === "development" &&
  new URLSearchParams(window.location.search).has("tune");

/**
 * The room on the about page: a painting of my room, drawn with three.js
 * once it's on screen, with the sun as it is at home right now and me in it
 * on my day's schedule, see room/room-scene.ts. The status says what I'm
 * doing and the button plays the last day through. The things that open
 * something on the page say so under the pointer.
 */
const Room = ({ fallback, pictures, onPick }: Props) => {
  // Holds the canvas, which is made with the room: a canvas keeps its
  // drawing context for good, and a room gives its context back when it
  // goes, so the next room needs a canvas of its own
  const hostRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<RoomHandle | null>(null);
  // Which look under the pointer is the latest: answers to older ones are
  // too late to show
  const hoverRef = useRef(0);
  const pressRef = useRef<Press | null>(null);
  const offsetRef = useRef({ ms: 0 });
  // While tuning, clicks in the room are the tuner's
  const isTuningRef = useRef(false);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();
  // What's on rotation first, on the record player's label and sleeve
  const { records } = useContent();
  const firstCover = records[0]?.cover;
  const sleeve = firstCover ? `/_next/image?url=${encodeURIComponent(firstCover)}&w=384&q=75` : undefined;
  const [mode, setMode] = useState<Mode>("building");
  // How far the room is from showing, 0 to 1, while it's being built
  const [progress, setProgress] = useState(0);
  // A picture of the room as it looks at this hour, shown blurred until the
  // room itself is ready. Picked here, not on the server: the page is built
  // ahead, and the hour is the visitor's
  const [still, setStill] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [clock, setClock] = useState("");
  const [isPlaying, setPlaying] = useState(false);
  const [pointed, setPointed] = useState<{ hotspot: Hotspot; x: number; y: number } | null>(null);

  // Built when it first comes on screen, drawn while it shows. The pictures
  // are read once, when it's built
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once, see above
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full";
    host.append(canvas);
    let room: RoomHandle | null = null;
    let isCancelled = false;
    let isShown = false;
    let isBuilding = false;
    let detachTuner: (() => void) | null = null;
    let stillTimer: ReturnType<typeof setTimeout> | null = null;

    // Shown once its light is baked, so the light never settles in view. The
    // room shows itself anyway if that takes too long, counting only while
    // it's on screen, see room-scene.ts
    // While the room is made, the browser's graphics are busy with it: other
    // canvases on the page wait to start, see gpu-busy.ts. Free again a
    // moment after it shows, once its first full frames are drawn
    let freeGraphics: (() => void) | null = null;
    const letGraphicsGo = () => {
      freeGraphics?.();
      freeGraphics = null;
    };
    const reveal = () => {
      if (isCancelled) return;
      setMode("ready");
      // The picture under it goes once the room has faded in over it
      stillTimer = setTimeout(() => {
        setStill(null);
        letGraphicsGo();
      }, STILL_AFTER);
    };
    const fail = () => {
      letGraphicsGo();
      if (!isCancelled) setMode("failed");
    };
    const tellProgress = (share: number) => {
      if (!isCancelled) setProgress(LOADED_SHARE + (1 - LOADED_SHARE) * share);
    };

    const build = async () => {
      isBuilding = true;
      const isTuning = wantsTuner();
      // The surfaces' painting starts first, from a small module of its
      // own, while the rest of the room is still on its way
      const painting = import("~/modules/about/room/painter").then(({ startPainting }) =>
        startPainting(),
      );
      // The room itself waits for the section to finish opening and for a
      // quiet moment: building it is heavy, and the opening would stutter
      await whenCalm();
      // And for lighter graphics set up first, like the light table's loupe,
      // to be entirely ready: they'd wait behind the room otherwise, holding
      // the page up, see gpu-busy.ts
      await whenGraphicsFree();
      if (isCancelled) {
        painting.then((started) => started.stop()).catch(() => {});
        return;
      }
      freeGraphics = holdGraphics();

      // Drawn in a worker where the browser can, off the page entirely, see
      // room.worker.ts. The tuner reaches into the room, so it's drawn on
      // the page while tuning, and where there's no other way
      if (!isTuning && typeof canvas.transferControlToOffscreen === "function") {
        let started: Awaited<typeof painting>;
        let startRoomWorker: typeof import("~/modules/about/room/room-client").startRoomWorker;
        try {
          [{ startRoomWorker }, started] = await Promise.all([
            import("~/modules/about/room/room-client"),
            painting,
          ]);
        } catch {
          painting.then((painter) => painter.stop()).catch(() => {});
          fail();
          return;
        }
        if (isCancelled) {
          started.stop();
          return;
        }
        setProgress(LOADED_SHARE);
        room = startRoomWorker(
          canvas,
          {
            view: viewOf(host),
            layout: copyLayout(savedLayout),
            pictures,
            sleeve,
            reducedMotion: prefersLessMotion(),
            painting: started,
          },
          {
            onStatus: setStatus,
            onProgress: tellProgress,
            onReady: reveal,
            onFailed: () => {
              fail();
            },
          },
        );
        roomRef.current = room;
        room.setVisible(isShown);
        return;
      }

      let loaded: [
        typeof import("~/modules/about/room/room-scene"),
        typeof import("~/modules/about/room/layout"),
        typeof import("~/modules/about/room/tuner") | null,
        Awaited<typeof painting>,
      ];
      try {
        loaded = await Promise.all([
          import("~/modules/about/room/room-scene"),
          import("~/modules/about/room/layout"),
          isTuning ? import("~/modules/about/room/tuner") : null,
          painting,
        ]);
      } catch {
        // Its code didn't come, like just after the site changed: the
        // picture of the room instead, and no painting for nothing
        painting.then((started) => started.stop()).catch(() => {});
        fail();
        return;
      }
      const [{ createRoom }, , tuner, started] = loaded;
      if (isCancelled) {
        started.stop();
        return;
      }
      setProgress(LOADED_SHARE);
      // After a paint, so the box is up while the room is being made
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (isCancelled) {
        started.stop();
        return;
      }
      const draft = tuner?.readDraft() ?? null;
      let built: RoomScene;
      try {
        built = await createRoom(canvas, {
          onStatus: setStatus,
          onProgress: tellProgress,
          onReady: reveal,
          layout: draft ?? copyLayout(savedLayout),
          pictures,
          sleeve,
          painting: started,
          reducedMotion: prefersLessMotion(),
        });
      } catch {
        started.stop();
        fail();
        return;
      }
      // Gone while it was being built: let go of it at once
      if (isCancelled) {
        built.destroy();
        return;
      }
      room = handleOf(built);
      roomRef.current = room;
      room.resize(viewOf(host));
      room.setVisible(isShown);

      if (tuner) {
        const tuned = built;
        isTuningRef.current = true;
        detachTuner = tuner.attachTuner(tuned, {
          hasDraft: draft !== null,
          setOffset: (ms) => {
            offsetRef.current.ms = ms;
            tuned.setOffset(ms);
          },
        });
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isShown = entry.isIntersecting;
      if (room) room.setVisible(isShown);
      else if (isShown && !isBuilding) build();
    });
    observer.observe(host);

    const resizeObserver = new ResizeObserver(() => room?.resize(viewOf(host)));
    resizeObserver.observe(host);

    return () => {
      isCancelled = true;
      if (stillTimer) clearTimeout(stillTimer);
      letGraphicsGo();
      observer.disconnect();
      resizeObserver.disconnect();
      gsap.killTweensOf(offsetRef.current);
      detachTuner?.();
      isTuningRef.current = false;
      // Stopped at once, let go of later: freeing everything it holds is
      // heavy, and leaving the page is when the section closes, animated
      if (room) {
        room.setVisible(false);
        destroyWhenCalm(room);
      }
      roomRef.current = null;
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    const { stills } = savedLayout;
    if (stills) setStill(stillUrl(stillPhaseAt(new Date()), stills));
  }, []);

  // The clock at home, on the second, following a played day
  useEffect(() => {
    const show = () =>
      setClock(homeClockAt(new Date(Date.now() + offsetRef.current.ms)));
    show();
    const timer = setInterval(show, 1000);
    return () => clearInterval(timer);
  }, []);

  const play = () => {
    const room = roomRef.current;
    if (!room || isPlaying) return;
    haptic.onClick();
    setPlaying(true);
    const offset = offsetRef.current;
    const tick = () => {
      room.setOffset(offset.ms);
      setClock(homeClockAt(new Date(Date.now() + offset.ms)));
    };
    gsap.fromTo(offset, { ms: -DAY }, {
      ms: 0,
      duration: PLAY_SECONDS,
      ease: "sine.inOut",
      onUpdate: tick,
      onComplete: () => {
        tick();
        setPlaying(false);
      },
    });
  };

  const at = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const room = roomRef.current;
    if (!room || event.pointerType !== "mouse" || isTuningRef.current) return;
    const { x, y } = at(event);
    // Outlined, and grown a little, in the room itself
    const asked = ++hoverRef.current;
    room.hover({ x, y }).then((hotspot) => {
      if (asked !== hoverRef.current) return;
      setPointed((current) => {
        if (!hotspot) return null;
        if (current?.hotspot.label !== hotspot.label) haptic.onMouseEnter();
        return { hotspot, x, y };
      });
    });
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const { x, y } = at(event);
    pressRef.current = { id: event.pointerId, x, y };
  };

  // A press that stayed put is a click. One that moved, or was cancelled,
  // was the page scrolling, which isn't
  const handleUp = (event: PointerEvent<HTMLDivElement>, isCancelled = false) => {
    const press = pressRef.current;
    if (!press || press.id !== event.pointerId) return;
    pressRef.current = null;
    if (isTuningRef.current) return;
    const { x, y } = at(event);
    if (isCancelled || Math.hypot(x - press.x, y - press.y) >= DRAG_FROM) return;
    roomRef.current?.pick(press.x, press.y).then((hotspot) => {
      if (!hotspot) return;
      haptic.onClick();
      onPick(hotspot.target);
    });
  };

  const handleLeave = () => {
    hoverRef.current += 1;
    roomRef.current?.hover(null);
    setPointed(null);
  };

  return (
    <div className="relative size-full select-none overflow-hidden bg-neutral-950">
      {/* The room as it looks at this hour: blurred while the live one is
          made, which then fades in over it; sharp where it can't be drawn */}
      {still && (
        <img
          src={still}
          alt=""
          aria-hidden
          fetchPriority="high"
          decoding="async"
          onError={() => setStill(null)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-[filter,scale] duration-500",
            mode !== "failed" && "scale-105 blur-md brightness-75",
          )}
        />
      )}

      {/* Where the room can't be drawn and there's no picture of it, the photo */}
      {fallback && !still && mode === "failed" && (
        <Image src={fallback} alt="" fill sizes="(min-width: 1024px) 960px, 100vw" className="object-cover" />
      )}

      {mode !== "failed" && (
        <div
          ref={hostRef}
          role="img"
          aria-label="My room, in the light of the time of day at home"
          onPointerMove={handleMove}
          onPointerDown={handleDown}
          onPointerUp={(event) => handleUp(event)}
          onPointerCancel={(event) => handleUp(event, true)}
          onPointerLeave={handleLeave}
          className={cn(
            // Positioned like the picture under it, so it's drawn over it
            "relative size-full transition-opacity duration-500",
            mode === "ready" ? "opacity-100" : "opacity-0",
            pointed ? "cursor-pointer" : "cursor-default",
          )}
        />
      )}

      {/* What's under the pointer, and that it opens */}
      {pointed && (
        <div
          aria-hidden
          className="pointer-events-none absolute flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[0.625rem] bg-neutral-950/50 px-2 text-neutral-50 text-sm backdrop-blur-lg"
          style={{ left: pointed.x + 14, top: pointed.y + 14 }}
        >
          {pointed.hotspot.label}
          <span className="text-neutral-50/60">
            {pointed.hotspot.target === "gear" ? "open the gear book" : "see what's playing"}
          </span>
        </div>
      )}

      {/* While the room is made: how far it is, where its clock will be */}
      {mode === "building" && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end">
          <div
            role="progressbar"
            aria-label="Painting my room"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="flex h-6 items-center gap-2 rounded-[0.625rem] bg-neutral-50/10 px-2 text-neutral-50 text-sm"
          >
            <span className="text-neutral-50/80">Painting my room</span>
            <span aria-hidden className="h-0.5 w-12 overflow-hidden rounded-full bg-neutral-50/20">
              <span
                className="block h-full rounded-full bg-neutral-50 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          </div>
        </div>
      )}

      {/* The time at home and what I'm doing there */}
      {mode === "ready" && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div
            aria-live="polite"
            className="flex h-6 min-w-0 items-center gap-1.5 rounded-[0.625rem] bg-neutral-950/33 px-2 text-neutral-50 text-sm backdrop-blur-lg"
          >
            <span className="tabular-nums">{clock}</span>
            {status && (
              <>
                <span aria-hidden className="text-neutral-50/50">
                  ·
                </span>
                <span className="truncate text-neutral-50/80">{status}</span>
              </>
            )}
          </div>

          {animationsEnabled && (
            <button
              type="button"
              aria-label="Play the last day"
              title="Play the last day"
              disabled={isPlaying}
              onClick={play}
              onMouseEnter={haptic.onMouseEnter}
              className="pointer-events-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[0.625rem] bg-neutral-950/33 text-neutral-50 backdrop-blur-lg transition-colors duration-200 hover:bg-neutral-950/50 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:cursor-default disabled:bg-neutral-950/50"
            >
              <FastForward aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Room;
