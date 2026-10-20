"use client";

import {
  type PropsWithChildren,
  type PointerEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import cn from "~/utils/cn";

// Figma's own measurement colours, so the overlay reads as the tool it imitates.
export const SELECTION = "#0d99ff";
export const REDLINE = "#f24822";

type Box = { x: number; y: number; width: number; height: number };
type Band = Box & { value: number };

interface Measure {
  name: string;
  box: Box;
  size: { width: number; height: number };
  padding: Band[];
  gaps: Band[];
  specs: [label: string, value: string][];
}

const TOKEN_RAMPS = ["neutral", "primary", "success", "warning", "error"];
const TOKEN_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SEMANTIC_TOKENS = ["action", "on-action", "tint", "tint-fg"];

const toRgb = (color: string) => {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.append(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
};

// Reads the scope's resolved tokens so a computed colour can be named, the way
// Dev Mode names a variable instead of printing its hex.
const tokenCache = new Map<string, Map<string, string>>();

const readTokens = (scope: Element) => {
  const key = `${scope.getAttribute("data-theme")}-${scope.getAttribute("data-mode")}`;
  const cached = tokenCache.get(key);
  if (cached) return cached;

  const style = getComputedStyle(scope);
  const names = [
    ...SEMANTIC_TOKENS,
    ...TOKEN_RAMPS.flatMap((ramp) => TOKEN_STEPS.map((step) => `${ramp}-${step}`)),
  ];
  const tokens = new Map<string, string>();

  for (const name of names) {
    const value = style.getPropertyValue(`--pds-${name}`).trim();

    if (value && !value.includes("gradient")) {
      const rgb = toRgb(value);

      if (!tokens.has(rgb)) {
        tokens.set(rgb, name);
      }
    }
  }

  tokenCache.set(key, tokens);
  return tokens;
};

const isVisible = (color: string) =>
  color !== "rgba(0, 0, 0, 0)" && color !== "transparent";

const fontName = (family: string) => {
  if (family.includes("Geist")) return "Geist";
  if (family.includes("Inter")) return "Inter";
  return family.split(",")[0]?.replaceAll('"', "") ?? family;
};

const round = (value: number) => Math.round(value * 10) / 10;

const measure = (element: HTMLElement, stage: HTMLElement, scale: number): Measure => {
  const stageRect = stage.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const scope = element.closest(".pds");
  const tokens = scope ? readTokens(scope) : new Map<string, string>();
  const token = (color: string) => tokens.get(color) ?? color;

  const box = {
    x: rect.left - stageRect.left,
    y: rect.top - stageRect.top,
    width: rect.width,
    height: rect.height,
  };

  const top = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.borderTopWidth);
  const right = Number.parseFloat(style.paddingRight) + Number.parseFloat(style.borderRightWidth);
  const bottom = Number.parseFloat(style.paddingBottom) + Number.parseFloat(style.borderBottomWidth);
  const left = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.borderLeftWidth);

  const padding: Band[] = [
    { ...box, height: top * scale, value: Number.parseFloat(style.paddingTop) },
    { ...box, y: box.y + box.height - bottom * scale, height: bottom * scale, value: Number.parseFloat(style.paddingBottom) },
    { ...box, width: left * scale, value: Number.parseFloat(style.paddingLeft) },
    { ...box, x: box.x + box.width - right * scale, width: right * scale, value: Number.parseFloat(style.paddingRight) },
  ].filter((band) => band.value > 0);

  const gaps: Band[] = [];
  const isFlex = style.display.includes("flex") || style.display.includes("grid");

  if (isFlex) {
    const isRow = style.display.includes("flex") ? style.flexDirection.startsWith("row") : false;
    const children = [...element.children]
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .filter((child) => getComputedStyle(child).position !== "absolute" && child.offsetWidth + child.offsetHeight > 0)
      .map((child) => child.getBoundingClientRect());

    for (let index = 1; index < children.length; index++) {
      const before = children[index - 1];
      const after = children[index];

      if (!before || !after) continue;

      const space = isRow ? after.left - before.right : after.top - before.bottom;

      if (space < 0.5) continue;

      gaps.push(
        isRow
          ? { x: before.right - stageRect.left, y: box.y + top * scale, width: space, height: box.height - (top + bottom) * scale, value: space / scale }
          : { x: box.x + left * scale, y: before.bottom - stageRect.top, width: box.width - (left + right) * scale, height: space, value: space / scale },
      );
    }
  }

  const specs: [string, string][] = [
    ["Size", `${round(element.offsetWidth)} × ${round(element.offsetHeight)}`],
  ];

  if (padding.length) {
    const values = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map((value) => round(Number.parseFloat(value)));
    const [t, r, b, l] = values;
    specs.push(["Padding", t === b && r === l ? (t === r ? `${t}` : `${t} ${r}`) : values.join(" ")]);
  }

  if (gaps[0]) specs.push(["Gap", `${round(gaps[0].value)}`]);

  const radius = Number.parseFloat(style.borderTopLeftRadius);
  if (radius > 0) specs.push(["Radius", radius > 999 ? "Full" : `${round(radius)}`]);

  const borderWidth = Number.parseFloat(style.borderTopWidth);
  if (borderWidth > 0 && isVisible(style.borderTopColor)) {
    specs.push(["Border", `${borderWidth} ${token(style.borderTopColor)}`]);
  }

  if (isVisible(style.backgroundColor)) specs.push(["Fill", token(style.backgroundColor)]);

  if (element.innerText.trim()) {
    specs.push(["Type", `${fontName(style.fontFamily)} ${style.fontWeight === "500" ? "Medium" : "Regular"} ${round(Number.parseFloat(style.fontSize))}`]);
    specs.push(["Text", token(style.color)]);
  }

  const name = element.closest<HTMLElement>("[data-slot]")?.dataset.slot ?? element.tagName.toLowerCase();

  return {
    name: name.replaceAll("-", " "),
    box,
    size: { width: element.offsetWidth, height: element.offsetHeight },
    padding,
    gaps,
    specs,
  };
};

const Pill = ({ x, y, color, children }: PropsWithChildren<{ x: number; y: number; color: string }>) => (
  <span
    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] px-1 py-px text-[10px] text-white tabular-nums leading-tight"
    style={{ left: x, top: y, backgroundColor: color }}
  >
    {children}
  </span>
);

const Handle = ({ x, y }: { x: number; y: number }) => (
  <span
    className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 border bg-white"
    style={{ left: x, top: y, borderColor: SELECTION }}
  />
);

interface RedlineProps {
  /** Selects the element measured when the pointer is away. */
  initial: string;
  /** How far the specimen is blown up, so 6px of padding is still visible. */
  scale?: number;
  /** Draws a layout grid over the initial element, like a frame's column grid in Figma. */
  columns?: number;
  gutter?: number;
  className?: string;
  /** Wraps the stage, so it can take the specimen's own surface. */
  wrapStage?: (stage: ReactElement) => ReactElement;
}

/**
 * Shows a live component the way Figma's Dev Mode shows a selection: a blue box
 * with its size, padding bands, gaps between children in red, and an inspect
 * panel naming the tokens. Hover any part to measure it.
 */
export const Redline = ({
  initial,
  scale = 2,
  columns,
  gutter = 16,
  className,
  wrapStage = (stage) => stage,
  children,
}: PropsWithChildren<RedlineProps>) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const [result, setResult] = useState<Measure | null>(null);
  const [frame, setFrame] = useState<Box | null>(null);

  const update = useCallback(() => {
    const stage = stageRef.current;
    const first = stage?.querySelector<HTMLElement>(initial);
    const target = hovered ?? first;

    if (stage && target) {
      setResult(measure(target, stage, scale));
    }

    if (stage && first) {
      setFrame(measure(first, stage, scale).box);
    }
  }, [hovered, initial, scale]);

  useLayoutEffect(update, [update]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    document.fonts.ready.then(update);

    return () => observer.disconnect();
  }, [update]);

  const onPointerMove = (event: PointerEvent) => {
    const target = event.target;
    const specimen = stageRef.current?.querySelector("[data-specimen]");

    // The theme scope only wraps the specimen; it isn't part of the component.
    if (
      target instanceof HTMLElement &&
      specimen?.contains(target) &&
      target !== specimen &&
      !target.classList.contains("pds")
    ) {
      setHovered(target);
    }
  };

  return (
    <div className={cn("grid md:grid-cols-[1fr_15rem]", className)}>
      {wrapStage(
        <div
          ref={stageRef}
          className="relative flex min-h-80 items-center justify-center overflow-hidden px-6 py-16"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHovered(null)}
        >
          <div data-specimen style={{ transform: `scale(${scale})` }}>
            {children}
          </div>

          {result && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {columns &&
                frame &&
                Array.from({ length: columns }, (_, index) => {
                  const space = gutter * scale;
                  const width = (frame.width - space * (columns - 1)) / columns;

                  return (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
                      key={index}
                      className="absolute"
                      style={{
                        left: frame.x + index * (width + space),
                        top: frame.y,
                        width,
                        height: frame.height,
                        backgroundColor: `${SELECTION}12`,
                      }}
                    />
                  );
                })}
              {result.padding.map((band) => (
                <span
                  key={`${band.x}-${band.y}-${band.width}-${band.height}`}
                  className="absolute"
                  style={{ left: band.x, top: band.y, width: band.width, height: band.height, backgroundColor: `${REDLINE}1f` }}
                />
              ))}
              {result.gaps.map((gap) => (
                <span
                  key={`${gap.x}-${gap.y}`}
                  className="absolute"
                  style={{ left: gap.x, top: gap.y, width: gap.width, height: gap.height, backgroundColor: `${REDLINE}33` }}
                />
              ))}
              <span
                className="absolute border"
                style={{ left: result.box.x, top: result.box.y, width: result.box.width, height: result.box.height, borderColor: SELECTION }}
              />
              <Handle x={result.box.x} y={result.box.y} />
              <Handle x={result.box.x + result.box.width} y={result.box.y} />
              <Handle x={result.box.x} y={result.box.y + result.box.height} />
              <Handle x={result.box.x + result.box.width} y={result.box.y + result.box.height} />
              {[...result.padding, ...result.gaps].map((band) => (
                <Pill
                  key={`pill-${band.x}-${band.y}-${band.width}`}
                  x={band.x + band.width / 2}
                  y={band.y + band.height / 2}
                  color={REDLINE}
                >
                  {round(band.value)}
                </Pill>
              ))}
              <Pill
                x={result.box.x + result.box.width / 2}
                y={result.box.y + result.box.height + 14}
                color={SELECTION}
              >
                {round(result.size.width)} × {round(result.size.height)}
              </Pill>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-neutral-950/10 border-t px-5 py-5 text-xs md:border-t-0 md:border-l">
        <p className="text-neutral-950 text-sm capitalize">{result?.name ?? "—"}</p>
        <dl className="flex flex-col gap-2">
          {result?.specs.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-950/50">{label}</dt>
              <dd className="text-right text-neutral-950 tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
