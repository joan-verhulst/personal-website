"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Demo, Slider } from "~/modules/blog/components/demo";
import ShaderCanvas from "~/modules/blog/components/shader-canvas";
import { INK_FRAGMENT } from "~/modules/blog/demos/ink-gl";
import cn from "~/utils/cn";

const PHOTO = "/blog/storm-at-the-mill.jpg";
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
  blur: 10.8,
  unevenness: 0.265,
  patchSize: 0,
  focusX: 0.23,
  focusY: 0.365,
  focusSize: 0.12,
  falloff: 0.475,
  strokeLength: 1,
  strokeAngle: -59.4,
  balance: 0.55,
  detailScale: 0,
  clump: 0,
  inkWeight: 0.33,
  hardness: 1.188,
};

const BLACK_ON_PAPER = { ink: [0.086, 0.086, 0.086], paper: [0.973, 0.965, 0.945] };
// The site's own white, neutral-50 (#faf9f9)
const SITE_WHITE = [250 / 255, 249 / 255, 249 / 255];

// How close the photo is, and the point of it in the middle, 0 to 1 from the
// top left. It never shows past the photo's edges
interface Framing {
  zoom: number;
  x: number;
  y: number;
}

// The photo in the mat's window
const WHOLE: Framing = { zoom: 1.21, x: 0.615, y: 0.5 };
// The print in a white mat, everywhere in the post; the shader runs over both,
// so the print's edges distress like the rest of it
const MOUNT: Mount = { height: 0.793, aspect: 0.8, lift: 0 };

// A white mat with a window cut into it: the window's height as a share of the
// frame, its width to height, and how far it sits above the middle
interface Mount {
  height: number;
  aspect: number;
  lift: number;
}

const usePhoto = (framing: Framing, mount?: Mount) => {
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
      // Where the photo goes: the whole frame, or the mat's window
      let area = { x: 0, y: 0, width, height };
      if (mount) {
        const windowHeight = height * mount.height;
        const windowWidth = windowHeight * mount.aspect;
        area = {
          x: (width - windowWidth) / 2,
          y: (height * (1 - mount.lift) - windowHeight) / 2,
          width: windowWidth,
          height: windowHeight,
        };
        ctx.fillStyle = "#faf9f9";
        ctx.fillRect(0, 0, width, height);
      }
      const scale =
        Math.max(area.width / image.naturalWidth, area.height / image.naturalHeight) * framing.zoom;
      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;
      const left = Math.min(0, Math.max(area.width - drawnWidth, area.width / 2 - framing.x * drawnWidth));
      const top = Math.min(0, Math.max(area.height - drawnHeight, area.height / 2 - framing.y * drawnHeight));
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.width, area.height);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, area.x + left, area.y + top, drawnWidth, drawnHeight);
      ctx.restore();
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
  }, [framing, mount]);

  return { boxRef, photo };
};

interface InkCanvasProps {
  values: InkValues;
  split?: number;
  showFocus?: boolean;
  isFilling?: boolean;
  framing?: Framing;
  mount?: Mount;
  paper?: number[];
  onPointer?: (x: number, y: number) => void;
  className?: string;
}

const InkCanvas = ({
  values,
  split = 0,
  showFocus = false,
  isFilling = false,
  framing = WHOLE,
  mount = MOUNT,
  paper = SITE_WHITE,
  onPointer,
  className,
}: InkCanvasProps) => {
  const { boxRef, photo } = usePhoto(framing, mount);
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
      uPaper: paper,
    }),
    [ratio, split, showFocus, values, paper],
  );

  return (
    <div
      ref={boxRef}
      className={cn("w-full", isFilling ? "absolute inset-0" : "relative")}
      style={{
        backgroundColor: `rgb(${paper.map((channel) => Math.round(channel * 255)).join(" ")})`,
        aspectRatio: isFilling ? undefined : PHOTO_ASPECT,
      }}
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

/** The cover: the whole print in a white passe-partout, printed as one sheet. */
export const InkCover = () => (
  <div inert className="absolute inset-0">
    <InkCanvas values={DISTRESSED} isFilling framing={WHOLE} mount={MOUNT} paper={SITE_WHITE} />
  </div>
);

export const InkBeforeAfter = () => {
  const [split, setSplit] = useState(0.5);

  return (
    <>
      <InkCanvas
        values={DISTRESSED}
        framing={WHOLE}
        mount={MOUNT}
        paper={SITE_WHITE}
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
          <Slider label="Clump size" value={values.clump} min={0} max={8} step={0.05} format={px} onChange={set("clump")} />
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
