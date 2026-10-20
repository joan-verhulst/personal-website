"use client";

import { gsap } from "gsap";
import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import useInView from "~/modules/about/hooks/use-in-view";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

export interface DoodleProps {
  isShown: boolean;
  plays: number;
  canMove: boolean;
}

const DRAW = 0.9;
const DRAW_AFTER = 0.25;

const ink = (isShown: boolean, delay = 0): CSSProperties => ({
  strokeDasharray: 1,
  strokeDashoffset: isShown ? 0 : 1,
  transition: `stroke-dashoffset ${DRAW}s cubic-bezier(0.65, 0, 0.35, 1) ${DRAW_AFTER + delay}s`,
});

const dot = (isShown: boolean, delay = 0): CSSProperties => ({
  opacity: isShown ? 1 : 0,
  transition: `opacity 0.3s ease ${DRAW_AFTER + delay}s`,
});

const usePlay = ({ isShown, plays, canMove }: DoodleProps, play: () => void) => {
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    if (!isShown || !canMove) return;
    const timer = setTimeout(() => playRef.current(), (DRAW_AFTER + DRAW) * 1000);
    return () => clearTimeout(timer);
  }, [isShown, canMove]);

  useEffect(() => {
    if (plays > 0 && canMove) playRef.current();
  }, [plays, canMove]);
};

type Point = [number, number];

const ANCHOR_A: Point = [3, 18];
const ANCHOR_B: Point = [21, 6];
const HANDLE_A: Point = [9, 4];
const HANDLE_B: Point = [15, 20];

const at = ([x, y]: Point) => `${x} ${y}`;

const turn = ([x, y]: Point, [ox, oy]: Point, degrees: number): Point => {
  const angle = (degrees * Math.PI) / 180;
  const dx = x - ox;
  const dy = y - oy;
  return [
    Math.round((ox + dx * Math.cos(angle) - dy * Math.sin(angle)) * 100) / 100,
    Math.round((oy + dx * Math.sin(angle) + dy * Math.cos(angle)) * 100) / 100,
  ];
};

const pen = (bend: number) => {
  const a = turn(HANDLE_A, ANCHOR_A, bend * -0.6);
  const b = turn(HANDLE_B, ANCHOR_B, bend);
  return {
    a,
    b,
    curve: `M${at(ANCHOR_A)} C${at(a)} ${at(b)} ${at(ANCHOR_B)}`,
    handleA: `M${at(ANCHOR_A)} L${at(a)}`,
    handleB: `M${at(ANCHOR_B)} L${at(b)}`,
  };
};

export const PenDoodle = (props: DoodleProps) => {
  const { isShown } = props;
  const curveRef = useRef<SVGPathElement>(null);
  const handleARef = useRef<SVGPathElement>(null);
  const handleBRef = useRef<SVGPathElement>(null);
  const knobARef = useRef<SVGCircleElement>(null);
  const knobBRef = useRef<SVGCircleElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const rest = pen(0);

  usePlay(props, () => {
    if (tweenRef.current?.isActive()) return;
    const state = { bend: 0 };
    tweenRef.current = gsap.to(state, {
      bend: 48,
      duration: 0.45,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1,
      onUpdate: () => {
        const shape = pen(state.bend);
        curveRef.current?.setAttribute("d", shape.curve);
        handleARef.current?.setAttribute("d", shape.handleA);
        handleBRef.current?.setAttribute("d", shape.handleB);
        knobARef.current?.setAttribute("cx", String(shape.a[0]));
        knobARef.current?.setAttribute("cy", String(shape.a[1]));
        knobBRef.current?.setAttribute("cx", String(shape.b[0]));
        knobBRef.current?.setAttribute("cy", String(shape.b[1]));
      },
    });
  });

  useEffect(() => () => void tweenRef.current?.kill(), []);

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" className="size-full overflow-visible">
      <path ref={handleARef} d={rest.handleA} pathLength={1} strokeWidth={1} style={ink(isShown, 0.4)} />
      <path ref={handleBRef} d={rest.handleB} pathLength={1} strokeWidth={1} style={ink(isShown, 0.4)} />
      <path ref={curveRef} d={rest.curve} pathLength={1} strokeWidth={1.5} style={ink(isShown)} />
      <circle ref={knobARef} cx={rest.a[0]} cy={rest.a[1]} r={1.4} fill="currentColor" stroke="none" style={dot(isShown, 0.9)} />
      <circle ref={knobBRef} cx={rest.b[0]} cy={rest.b[1]} r={1.4} fill="currentColor" stroke="none" style={dot(isShown, 0.9)} />
      <rect x={1.5} y={16.5} width={3} height={3} className="fill-neutral-50" strokeWidth={1} style={dot(isShown, 0.2)} />
      <rect x={19.5} y={4.5} width={3} height={3} className="fill-neutral-50" strokeWidth={1} style={dot(isShown, 0.7)} />
    </svg>
  );
};

const BLADES =
  "M14.31 8 20.05 17.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16 3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94";

export const ShutterDoodle = (props: DoodleProps) => {
  const { isShown } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const bladesRef = useRef<SVGPathElement>(null);
  const flashRef = useRef<SVGCircleElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  usePlay(props, () => {
    if (timelineRef.current?.isActive()) return;
    timelineRef.current = gsap
      .timeline()
      .to(bladesRef.current, { rotation: "+=60", svgOrigin: "12 12", duration: 0.55, ease: "back.out(2)" }, 0)
      .to(svgRef.current, { scale: 0.8, duration: 0.08, ease: "power2.in" }, 0)
      .to(svgRef.current, { scale: 1, duration: 0.4, ease: "back.out(3)" }, 0.08)
      .fromTo(flashRef.current, { opacity: 0.3 }, { opacity: 0, duration: 0.45, ease: "power2.out" }, 0.04);
  });

  useEffect(() => () => void timelineRef.current?.kill(), []);

  return (
    <svg ref={svgRef} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-full overflow-visible">
      <circle ref={flashRef} cx={12} cy={12} r={9.5} fill="currentColor" stroke="none" opacity={0} />
      <circle cx={12} cy={12} r={10} pathLength={1} style={ink(isShown)} />
      <path ref={bladesRef} d={BLADES} pathLength={1} strokeWidth={1.25} style={ink(isShown, 0.3)} />
    </svg>
  );
};

export const CursorDoodle = (props: DoodleProps) => {
  const { isShown } = props;
  const arrowRef = useRef<SVGGElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  usePlay(props, () => {
    if (timelineRef.current?.isActive()) return;
    timelineRef.current = gsap
      .timeline()
      .fromTo(arrowRef.current, { x: 4, y: 4 }, { x: 0, y: 0, duration: 0.4, ease: "power3.out" })
      .to(arrowRef.current, { scale: 0.78, svgOrigin: "5 4", duration: 0.08, ease: "power2.in", yoyo: true, repeat: 1 })
      .fromTo(
        ringRef.current,
        { attr: { r: 1 }, opacity: 0.9 },
        { attr: { r: 8 }, opacity: 0, duration: 0.55, ease: "power2.out" },
        "<0.06",
      );
  });

  useEffect(() => () => void timelineRef.current?.kill(), []);

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-full overflow-visible">
      <circle ref={ringRef} cx={5} cy={4} r={1} strokeWidth={1} opacity={0} />
      <g ref={arrowRef}>
        <path d="M5 4 19 10.5 12.6 12.6 10.5 19Z" pathLength={1} style={ink(isShown)} />
      </g>
    </svg>
  );
};

export const Heading = ({
  doodle: Doodle,
  children,
}: {
  doodle: ComponentType<DoodleProps>;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref);
  const { animationsEnabled } = useAnimationPreference();
  const [plays, setPlays] = useState(0);

  return (
    <h2
      ref={ref}
      onMouseEnter={() => setPlays((count) => count + 1)}
      className="group/heading"
    >
      {children}
      <span
        aria-hidden
        className="ml-2.5 inline-flex size-[1.1em] items-center justify-center align-[-0.15em] text-neutral-950/30 transition-colors duration-300 group-hover/heading:text-neutral-950/60"
      >
        <Doodle
          isShown={isInView || !animationsEnabled}
          plays={plays}
          canMove={animationsEnabled}
        />
      </span>
    </h2>
  );
};
