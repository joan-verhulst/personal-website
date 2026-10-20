"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Demo, Slider } from "~/modules/blog/components/demo";
import ShaderCanvas from "~/modules/blog/components/shader-canvas";
import { INK_FRAGMENT } from "~/modules/blog/demos/ink-gl";
import cn from "~/utils/cn";

const PHOTO = "/blog/two-horses.jpg";
const PHOTO_ASPECT = 3 / 2;

export interface InkValues {
  blur: number;
  unevenness: number;
  patchSize: number;
  focusX: number;
  focusY: number;
  focusSize: number;
  falloff: number;
  strokeLength: number;
  strokeAngle: number;
  balance: number;
  detailScale: number;
  clump: number;
  inkWeight: number;
  hardness: number;
}

export const DISTRESSED: InkValues = {
  blur: 13,
  unevenness: 0.34,
  patchSize: 0.02,
  focusX: 0.14,
  focusY: 0.45,
  focusSize: 0.18,
  falloff: 0.72,
  strokeLength: 2.5,
  strokeAngle: -19,
  balance: 0.55,
  detailScale: 0.25,
  clump: 0.85,
  inkWeight: 0.48,
  hardness: 1.8,
};

const BLACK_ON_PAPER = { ink: [0.086, 0.086, 0.086], paper: [0.973, 0.965, 0.945] };

// How close the photo is, and the point of it in the middle, 0 to 1 from the
// top left. It never shows past the photo's edges
interface Framing {
  zoom: number;
  x: number;
  y: number;
}

const WHOLE: Framing = { zoom: 1, x: 0.5, y: 0.5 };
const ON_THE_HORSES: Framing = { zoom: 1.5, x: 0.515, y: 0.555 };

const usePhoto = (framing: Framing) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const image = new Image();
    image.src = PHOTO;
    const loaded = image.decode();

    const draw = async () => {
      try {
        await loaded;
      } catch {
        return;
      }
      if (isCancelled) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(box.clientWidth * ratio);
      const height = Math.round(box.clientHeight * ratio);
      if (width === 0 || height === 0) return;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale =
        Math.max(width / image.naturalWidth, height / image.naturalHeight) * framing.zoom;
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const left = Math.min(0, Math.max(width - drawnWidth, width / 2 - framing.x * drawnWidth));
      const top = Math.min(0, Math.max(height - drawnHeight, height / 2 - framing.y * drawnHeight));
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, left, top, drawnWidth, drawnHeight);
      setPhoto(canvas);
    };

    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(draw, 150);
    });
    observer.observe(box);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [framing]);

  return { boxRef, photo };
};

interface InkCanvasProps {
  values: InkValues;
  split?: number;
  showFocus?: boolean;
  isFilling?: boolean;
  framing?: Framing;
  onPointer?: (x: number, y: number) => void;
  className?: string;
}

const InkCanvas = ({
  values,
  split = 0,
  showFocus = false,
  isFilling = false,
  framing = WHOLE,
  onPointer,
  className,
}: InkCanvasProps) => {
  const { boxRef, photo } = usePhoto(framing);
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    setRatio(Math.min(window.devicePixelRatio || 1, 2));
  }, []);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: ratio,
      uSplit: split,
      uShowFocus: showFocus ? 1 : 0,
      uBlur: values.blur,
      uUneven: values.unevenness,
      uPatch: values.patchSize,
      uFocus: [values.focusX, values.focusY],
      uFocusSize: values.focusSize,
      uFalloff: values.falloff,
      uStrokeLength: values.strokeLength,
      uStrokeAngle: (values.strokeAngle * Math.PI) / 180,
      uBalance: values.balance,
      uDetail: values.detailScale,
      uClump: values.clump,
      uInkWeight: values.inkWeight,
      uHardness: values.hardness,
      uInk: BLACK_ON_PAPER.ink,
      uPaper: BLACK_ON_PAPER.paper,
    }),
    [ratio, split, showFocus, values],
  );

  return (
    <div
      ref={boxRef}
      className={cn("w-full bg-[#f8f6f1]", isFilling ? "absolute inset-0" : "relative")}
      style={isFilling ? undefined : { aspectRatio: PHOTO_ASPECT }}
    >
      <ShaderCanvas
        fragment={INK_FRAGMENT}
        uniforms={uniforms}
        textures={{ uImage: photo }}
        onPointer={onPointer}
        className={className}
      />
    </div>
  );
};

const px = (value: number) => `${value.toFixed(1)} px`;
const share = (value: number) => value.toFixed(2);

export const InkCover = () => (
  <InkCanvas values={DISTRESSED} isFilling framing={ON_THE_HORSES} />
);

export const InkBeforeAfter = () => {
  const [split, setSplit] = useState(0.5);

  return (
    <>
      <InkCanvas
        values={DISTRESSED}
        split={split}
        isFilling
        onPointer={(x) => setSplit(x)}
        className="cursor-ew-resize touch-pan-y"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-neutral-50 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{ left: `${split * 100}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-50 text-neutral-950 shadow-md">
          <ChevronsLeftRight className="size-4" />
        </span>
      </div>
    </>
  );
};

export const InkPlayground = () => {
  const [values, setValues] = useState<InkValues>(DISTRESSED);
  const set = (key: keyof InkValues) => (value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Demo
      caption="The look, with four of its settings handed to you. Drag the picture to move the sharp spot."
      controls={
        <>
          <Slider label="Blur" value={values.blur} min={0} max={20} step={0.1} format={px} onChange={set("blur")} />
          <Slider label="Stroke length" value={values.strokeLength} min={1} max={15} step={0.1} format={share} onChange={set("strokeLength")} />
          <Slider label="Clump size" value={values.clump} min={0.25} max={8} step={0.05} format={px} onChange={set("clump")} />
          <Slider label="Ink weight" value={values.inkWeight} min={0} max={1} format={share} onChange={set("inkWeight")} />
        </>
      }
    >
      <InkCanvas
        values={values}
        showFocus
        onPointer={(x, y) =>
          setValues((current) => ({ ...current, focusX: x, focusY: y }))
        }
      />
    </Demo>
  );
};
