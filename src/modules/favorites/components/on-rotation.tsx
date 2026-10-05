"use client";

import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RotationTrack } from "~/data/favorites";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import {
  isSoundEnabled,
  PREFERENCE_EVENT,
  useHapticSound,
} from "~/modules/core/hooks/use-haptic-sound";
import Turntable, { ARM } from "~/modules/favorites/components/turntable";
import Vinyl from "~/modules/favorites/components/vinyl";
import cn from "~/utils/cn";
import { track as trackEvent } from "~/utils/eyes";

// How long a record plays before the next one goes on
const PLAY_SECONDS = 15;
// How long the needle takes to come over and drop
const CUE_SECONDS = 0.8;

// Slider position to start at. Loudness is the square of the position, which
// feels even to the ear, so this plays at 4%: there, but barely.
const START_LEVEL = 0.2;
// Where unmuting goes back to when there's nothing to restore
const UNMUTE_LEVEL = 0.5;

// The record that peeks out of a sleeve on the shelf
const MINI_GROOVES =
  "repeating-radial-gradient(circle at center, #101010 0 1px, #222 1px 2px)";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const OnRotation = () => {
  const { records: onRotation } = useContent();
  const covers = useMemo(
    () =>
      onRotation.map(({ id, cover, title, artist }) => ({
        id,
        src: cover,
        alt: `${title} by ${artist}`,
      })),
    [onRotation],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tracks, setTracks] = useState<Record<number, RotationTrack>>({});
  const [level, setLevel] = useState(START_LEVEL);
  const recordRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<gsap.core.Timeline | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Fades multiply the volume, so the slider never jumps while one runs
  const fadeRef = useRef({ amount: 0 });
  const levelRef = useRef(level);
  levelRef.current = level;
  const unmuteLevelRef = useRef(UNMUTE_LEVEL);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  const active = onRotation[activeIndex];
  const track = tracks[active.favoriteSong.appleId];

  const applyVolume = () => {
    if (!audioRef.current) return;
    audioRef.current.volume = levelRef.current ** 2 * fadeRef.current.amount;
    // iOS ignores volume and always plays at full, so silence is a mute
    audioRef.current.muted = levelRef.current === 0;
  };

  const fadeTo = (
    amount: number,
    duration: number,
    onComplete?: () => void,
  ) => {
    gsap.killTweensOf(fadeRef.current);
    gsap.to(fadeRef.current, {
      amount,
      duration,
      ease: "none",
      onUpdate: applyVolume,
      onComplete,
    });
  };

  // Browsers block sound until the visitor has interacted with the page. If
  // that's still the case, the record keeps spinning silently and the next
  // click or slider drag starts the sound.
  const startSound = () => {
    const audio = audioRef.current;
    if (!audio?.src || !audio.paused) return;

    audio
      .play()
      .then(() => fadeTo(1, 0.6))
      .catch(() => {});
  };

  // Lifts the record off, swaps it while it's up and sets the next one down
  const play = (index: number, { silent = false } = {}) => {
    if (index === activeIndex) return;
    // Silent is the next record coming up by itself, which isn't a pick
    if (!silent) {
      haptic.onClick();
      const { title, artist } = onRotation[index];
      trackEvent("Record Played", { record: title, artist });
    }
    setIsPlaying(true);
    timelineRef.current?.kill();
    fadeTo(0, 0.2);

    if (!animationsEnabled || prefersReducedMotion()) {
      setActiveIndex(index);
      return;
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;

    // The arm swings clear before the record comes off
    gsap.to(armRef.current, {
      rotation: ARM.rest,
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
    });
    tl.to(recordRef.current, {
      y: -12,
      scale: 0.94,
      duration: 0.2,
      ease: "power2.in",
    });
    tl.to(detailsRef.current, { opacity: 0, duration: 0.2 }, 0);
    tl.call(() => setActiveIndex(index), [], 0.2);
    tl.to(
      recordRef.current,
      { y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" },
      0.2,
    );
    tl.to(detailsRef.current, { opacity: 1, duration: 0.3 }, 0.3);
  };

  // Wraps around both ways
  const step = (direction: 1 | -1, options?: { silent?: boolean }) =>
    play(
      (activeIndex + direction + onRotation.length) % onRotation.length,
      options,
    );

  // The timer's callback outlives the render it was made in
  const stepRef = useRef(step);
  stepRef.current = step;

  const changeLevel = (next: number) => {
    if (next > 0) unmuteLevelRef.current = next;
    setLevel(next);
    if (next > 0 && isPlaying) startSound();
  };

  // Real titles, artists and preview clips. Until they arrive, or if they
  // never do, the record shows what's in the data and plays without sound.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/on-rotation", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : {}))
      .then(setTracks)
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // One audio element for the player's lifetime, silenced when it closes
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      gsap.killTweensOf(fadeRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  // Follows the site's sound setting: off means muted, until the visitor
  // turns the volume up here themselves
  useEffect(() => {
    // Phones start silent too: a song playing out loud on open is unwelcome
    // there, and the fader is a small target to find in a hurry
    const isPhone = window.matchMedia("(pointer: coarse)").matches;
    if (!isSoundEnabled() || isPhone) setLevel(0);

    const handleChange = (event: Event) => {
      if (!(event as CustomEvent<boolean>).detail) setLevel(0);
    };

    window.addEventListener(PREFERENCE_EVENT, handleChange);
    return () => window.removeEventListener(PREFERENCE_EVENT, handleChange);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: applyVolume only reads refs
  useEffect(() => {
    applyVolume();
  }, [level]);

  // Puts the record's song on, or takes it off while paused
  // biome-ignore lint/correctness/useExhaustiveDependencies: the helpers only read refs
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (audio.src !== track.previewUrl) {
      gsap.killTweensOf(fadeRef.current);
      fadeRef.current.amount = 0;
      audio.src = track.previewUrl;
    }

    if (isPlaying) {
      startSound();
    } else {
      fadeTo(0, 0.2, () => audio.pause());
    }
  }, [track, isPlaying]);

  // One side of a record: the needle comes over, then follows the groove in
  // toward the label for as long as the record plays. It's the timer too.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex starts a new side for the next record
  useEffect(() => {
    const arm = armRef.current;
    if (!arm) return;

    if (!animationsEnabled || prefersReducedMotion()) {
      gsap.set(arm, { rotation: ARM.outer });
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => stepRef.current(1, { silent: true }),
    });
    // Waits for the record to be down
    tl.to(
      arm,
      { rotation: ARM.outer, duration: CUE_SECONDS, ease: "power2.inOut" },
      0.35,
    );
    tl.to(arm, { rotation: ARM.inner, duration: PLAY_SECONDS, ease: "none" });
    if (progressRef.current)
      tl.fromTo(
        progressRef.current,
        // Width, not a scale, so the rounded ends keep their shape
        { width: "0%" },
        { width: "100%", duration: PLAY_SECONDS, ease: "none" },
        "<",
      );
    sideRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [activeIndex, animationsEnabled]);

  useEffect(() => {
    sideRef.current?.paused(!isPlaying);
  }, [isPlaying]);

  const togglePlaying = () => {
    haptic.onClick();
    setIsPlaying((playing) => !playing);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Turntable
        armRef={armRef}
        isPlaying={isPlaying}
        level={level}
        onToggle={togglePlaying}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        onLevel={changeLevel}
        onMute={() => {
          haptic.onClick();
          changeLevel(level === 0 ? unmuteLevelRef.current : 0);
        }}
      >
        <button
          type="button"
          aria-label="Next record"
          onClick={() => step(1)}
          onMouseEnter={haptic.onMouseEnter}
          className="block size-full cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-[#d7b97a] focus-visible:outline-offset-4"
        >
          <div ref={recordRef}>
            <Vinyl
              covers={covers}
              activeId={active.id}
              sizes="200px"
              playing={isPlaying}
              className="w-full shadow-[0_3px_8px_rgb(0_0_0/0.6)]"
            />
          </div>
        </button>
      </Turntable>

      {/* The queue, as tall as the deck: the deck sets the row height and the
          queue scrolls within it instead of stretching it */}
      <div className="relative inset-border min-w-0 rounded-3xl bg-white">
        <div className="flex flex-col gap-5 p-5 md:absolute md:inset-0">
          {/* Now playing */}
          <div>
            <div ref={detailsRef} aria-live="polite">
              <span className="block truncate text-2xl text-neutral-950 leading-tight">
                {track?.title ?? active.favoriteSong.title}
              </span>
              <span className="block truncate font-light text-base text-neutral-950/66">
                {track?.artist ?? active.artist} · {active.title}
              </span>
            </div>

            {/* How far the needle is across the record */}
            <div className="mt-4 flex items-center gap-3">
              <div className="relative h-[3px] flex-1 rounded-full bg-neutral-950/10">
                {animationsEnabled && (
                  <div
                    ref={progressRef}
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-0 rounded-full bg-neutral-950"
                  />
                )}
              </div>
              {track && (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={haptic.onClick}
                  onMouseEnter={haptic.onMouseEnter}
                  className="flex shrink-0 items-center gap-0.5 text-neutral-950/50 text-xs transition-colors duration-200 hover:text-neutral-950"
                >
                  Apple Music
                  <ArrowUpRight className="size-3" />
                </a>
              )}
            </div>
          </div>

          {/* Every record, to put on by hand. It scrolls when
              they don't all fit next to the deck */}
          <ul className="-mx-2 -mb-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {onRotation.map((record, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={record.id}>
                  <button
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => play(index)}
                    onMouseEnter={haptic.onMouseEnter}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl py-2 pr-6 pl-2 text-left transition-colors duration-200",
                      isActive
                        ? "inset-border bg-neutral-50"
                        : "hover:bg-neutral-950/5",
                    )}
                  >
                    {/* Sleeve, with its record pulled halfway out when it's on */}
                    <span className="relative block h-12 w-18 shrink-0">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1 left-1 flex size-10 items-center justify-center rounded-full transition-transform duration-500 ease-out",
                          isActive
                            ? "translate-x-6"
                            : "group-hover:translate-x-2.5",
                        )}
                        style={{ background: MINI_GROOVES }}
                      >
                        <span className="size-3 rounded-full bg-[#d7b97a]" />
                      </span>
                      <span className="relative inset-border block size-12 overflow-hidden rounded-md shadow-[2px_0_6px_-2px_rgb(0_0_0/0.35)]">
                        <Image
                          src={record.cover}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base text-neutral-950 leading-tight">
                        {record.title}
                      </span>
                      <span className="block truncate font-light text-neutral-950/66 text-sm leading-tight">
                        {record.artist}
                      </span>
                    </span>

                    {isActive ? (
                      // Level meter, moving while the record plays
                      <span
                        aria-hidden
                        className="flex h-3 shrink-0 items-end gap-0.5"
                      >
                        {[0, 1, 2].map((bar) => (
                          <span
                            key={bar}
                            className={cn(
                              "h-full w-0.5 origin-bottom rounded-full bg-neutral-950",
                              animationsEnabled &&
                                "animate-meter motion-reduce:animate-none",
                            )}
                            style={{
                              animationDelay: `${bar * -0.3}s`,
                              animationPlayState: isPlaying
                                ? "running"
                                : "paused",
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="shrink-0 text-neutral-950/40 text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OnRotation;
