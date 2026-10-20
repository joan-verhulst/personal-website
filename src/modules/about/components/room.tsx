"use client";

import { gsap } from "gsap";
import { FastForward } from "lucide-react";
import Image from "next/image";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import RoomPerf from "~/modules/about/components/room-perf";
import { handleOf, type RoomHandle } from "~/modules/about/room/handle";
import { copyLayout, savedLayout } from "~/modules/about/room/layout";
import type { Hotspot } from "~/modules/about/room/parts";
import type { PerfReport } from "~/modules/about/room/profiler";
import type { Room as RoomScene, RoomView } from "~/modules/about/room/room-scene";
import { homeClockAt } from "~/modules/about/room/schedule";
import { stillPhaseAt, stillUrl } from "~/modules/about/room/stills";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { useThreeD } from "~/modules/core/hooks/use-three-d";
import { holdGraphics, whenGraphicsFree } from "~/modules/core/utils/gpu-busy";
import { getState, subscribe } from "~/utils/app-layer";
import cn from "~/utils/cn";

const PLAY_SECONDS = 16;
const CLOCK_EVERY = 1000 / 30;
const DAY = 86_400_000;
const DRAG_FROM = 6;
const LOADED_SHARE = 0.1;
const STILL_AFTER = 700;

interface Props {
  fallback?: string;
  pictures: string[];
  onPick: (target: Hotspot["target"]) => void;
}

interface Press {
  id: number;
  x: number;
  y: number;
}

type Mode = "building" | "ready" | "failed";

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

const viewOf = (host: HTMLElement): RoomView => ({
  width: host.clientWidth,
  height: host.clientHeight,
  devicePixelRatio: window.devicePixelRatio || 1,
});

const prefersLessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wantsTuner = () =>
  process.env.NODE_ENV === "development" &&
  new URLSearchParams(window.location.search).has("tune");

const wantsPerf = () =>
  process.env.NODE_ENV === "development" &&
  new URLSearchParams(window.location.search).has("perf");

const Room = ({ fallback, pictures, onPick }: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<RoomHandle | null>(null);
  const hoverRef = useRef(0);
  const pressRef = useRef<Press | null>(null);
  const offsetRef = useRef({ ms: 0 });
  const isTuningRef = useRef(false);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();
  const { records } = useContent();
  const firstCover = records[0]?.cover;
  const sleeve = firstCover ? `/_next/image?url=${encodeURIComponent(firstCover)}&w=384&q=75` : undefined;
  const [mode, setMode] = useState<Mode>("building");
  const isThreeD = useThreeD();
  const shown: Mode = isThreeD ? mode : "failed";
  const [progress, setProgress] = useState(0);
  const [still, setStill] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [clock, setClock] = useState("");
  const [isPlaying, setPlaying] = useState(false);
  const [pointed, setPointed] = useState<{ hotspot: Hotspot; x: number; y: number } | null>(null);
  const [isProfiling, setProfiling] = useState(false);
  const [perf, setPerf] = useState<PerfReport | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: built once, see above
  useEffect(() => {
    const host = hostRef.current;
    if (!isThreeD || !host) return;
    setMode("building");
    setProgress(0);
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full";
    host.append(canvas);
    let room: RoomHandle | null = null;
    let isCancelled = false;
    let isShown = false;
    let isBuilding = false;
    let detachTuner: (() => void) | null = null;
    let stillTimer: ReturnType<typeof setTimeout> | null = null;

    // While the room is made, other canvases wait for the GPU, see gpu-busy.ts
    let freeGraphics: (() => void) | null = null;
    const letGraphicsGo = () => {
      freeGraphics?.();
      freeGraphics = null;
    };
    const reveal = () => {
      if (isCancelled) return;
      setMode("ready");
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
      const profile = wantsPerf();
      setProfiling(profile);
      const onPerf = profile ? setPerf : undefined;
      const painting = import("~/modules/about/room/painter").then(({ startPainting }) =>
        startPainting(),
      );
      await whenCalm();
      // Lighter canvases (the loupe) go first, or they'd wait behind the room
      await whenGraphicsFree();
      if (isCancelled) {
        painting.then((started) => started.stop()).catch(() => {});
        return;
      }
      freeGraphics = holdGraphics();

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
            profile,
            painting: started,
          },
          {
            onStatus: setStatus,
            onProgress: tellProgress,
            onReady: reveal,
            onPerf,
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
          onPerf,
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
      if (room) {
        room.setVisible(false);
        destroyWhenCalm(room);
      }
      roomRef.current = null;
      canvas.remove();
    };
  }, [isThreeD]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: picked again on each turn
  useEffect(() => {
    const { stills } = savedLayout;
    if (stills) setStill(stillUrl(stillPhaseAt(new Date()), stills));
  }, [isThreeD]);

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
    // The clock shows no more than the room draws, or each change redraws this
    let lastShown = Number.NEGATIVE_INFINITY;
    const tick = (isLast = false) => {
      room.setOffset(offset.ms);
      const now = performance.now();
      if (!isLast && now - lastShown < CLOCK_EVERY) return;
      lastShown = now;
      setClock(homeClockAt(new Date(Date.now() + offset.ms)));
    };
    gsap.fromTo(offset, { ms: -DAY }, {
      ms: 0,
      duration: PLAY_SECONDS,
      ease: "sine.inOut",
      onUpdate: () => tick(),
      onComplete: () => {
        tick(true);
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
            shown !== "failed" && "scale-105 blur-md brightness-75",
          )}
        />
      )}

      {fallback && !still && shown === "failed" && (
        <Image src={fallback} alt="" fill sizes="(min-width: 1024px) 960px, 100vw" className="object-cover" />
      )}

      {shown !== "failed" && (
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
            "relative size-full transition-opacity duration-500",
            shown === "ready" ? "opacity-100" : "opacity-0",
            pointed ? "cursor-pointer" : "cursor-default",
          )}
        />
      )}

      {isProfiling && isThreeD && <RoomPerf report={perf} />}

      {pointed && shown === "ready" && (
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

      {shown === "building" && (
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

      {shown === "ready" && (
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
