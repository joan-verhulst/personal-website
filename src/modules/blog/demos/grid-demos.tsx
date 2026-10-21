"use client";

import "continuum/styles.css";

import { Theme } from "continuum";
import {
  allocateColumns,
  Area,
  Band,
  type ColumnSpec,
  computeRaster,
  Mark,
  RasterViewport,
  Row,
  SequenceRaster,
  Text,
  useRaster,
} from "continuum/experimental";
import { Grid3x3, Maximize2, Minimize2 } from "lucide-react";
import { Geist, Inter } from "next/font/google";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Demo } from "~/modules/blog/components/demo";
import { REDLINE } from "~/modules/blog/demos/redline";
import cn from "~/utils/cn";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fonts = `${geist.variable} ${inter.variable}`;

// Figma's layout-grid colours: columns in red, baselines in blue.
const COLUMN_TINT = "rgb(242 72 34 / 0.08)";

const baselineGrid = (line: number) =>
  [
    `repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.35) 0 1px, transparent 1px ${line}px)`,
    "repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.1) 0 1px, transparent 1px 4px)",
  ].join(", ");

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Tinted bands for a run of columns, as Figma draws a layout grid. */
const ColumnTint = ({ count }: { count: number }) =>
  Array.from({ length: count }, (_, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
    <span className="rounded-[3px]" key={index} style={{ background: COLUMN_TINT }} />
  ));

/** A Figma-style measurement: a red line with its length in a pill. */
const Measure = ({ x, y, length, vertical = false }: { x: number; y: number; length: number; vertical?: boolean }) => (
  <span
    aria-hidden
    className="pointer-events-none absolute"
    style={{ left: x, top: y, width: vertical ? 1 : length, height: vertical ? length : 1, background: REDLINE }}
  >
    <span
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[3px] px-1 text-[10px] text-white tabular-nums leading-3.5"
      style={{ background: REDLINE }}
    >
      {length}
    </span>
  </span>
);

const COPY =
  "Build the sequence by adding emails and grouping them into phases. Emails in a phase go out in order at the set interval, and each phase waits for the one before it to finish.";

const LINE = 16;

/* The unit ------------------------------------------------------------------- */

const UNIT_ROWS = [
  ["1", "Welcome email", "48%"],
  ["2", "Getting started guide", "41%"],
  ["3", "Tips & tricks", "37%"],
];

const UNIT_COLUMNS = 8;

/**
 * A few rows of the sequence table at real size, on its baseline grid, with
 * the unit measured: margins and gutters one line, rows two.
 */
export const UnitFigure = () => {
  const [ref, width] = useWidth();
  const row = LINE * 2;
  const column = (width - LINE * 2 - (UNIT_COLUMNS - 1) * LINE) / UNIT_COLUMNS;
  const grid: CSSProperties = {
    gridTemplateColumns: `repeat(${UNIT_COLUMNS}, minmax(0, 1fr))`,
    columnGap: LINE,
  };
  // Measures sit in the empty sixth column, clear of the text.
  const free = LINE + 5 * (column + LINE) + column / 2;

  return (
    <Demo caption="13px type on a 16px line. Margins and gutters are one line, rows are two, and every baseline sits on the 4px grid.">
      <Theme
        ref={ref}
        className={cn(fonts, "relative bg-neutral-50 text-[13px] text-neutral-950")}
        style={{ backgroundImage: baselineGrid(LINE), padding: `${LINE * 2}px ${LINE}px`, lineHeight: `${LINE}px` }}
      >
        <div aria-hidden className="pointer-events-none absolute grid" style={{ ...grid, inset: `0 ${LINE}px` }}>
          <ColumnTint count={UNIT_COLUMNS} />
        </div>
        <Row className="relative gap-2" height={row}>
          <Mark className="mt-0.5" style={{ backgroundColor: "var(--pds-chart-1)" }} />
          <Text>Phase 1</Text>
          <Text className="text-neutral-500">72h interval</Text>
        </Row>
        <div className="relative grid" style={{ ...grid, marginTop: LINE }}>
          {UNIT_ROWS.map(([number, name, open]) => (
            <div className="col-span-full grid grid-cols-subgrid" key={number}>
              <Row height={row}>
                <Text className="text-neutral-500 tabular-nums">{number}</Text>
              </Row>
              <Row height={row} style={{ gridColumn: "2 / span 4" }}>
                <Text className="truncate">{name}</Text>
              </Row>
              <Row className="justify-end" height={row} style={{ gridColumn: "7 / span 2" }}>
                <Text className="text-neutral-600 tabular-nums">{open}</Text>
              </Row>
            </div>
          ))}
        </div>
        {width > 0 && (
          <>
            <Measure length={LINE} x={0} y={LINE * 5 + LINE / 2} />
            <Measure length={LINE} x={LINE + column} y={LINE * 7 + LINE / 2} />
            <Measure length={LINE} vertical x={free} y={LINE * 4} />
            <Measure length={row} vertical x={free} y={LINE * 5} />
          </>
        )}
      </Theme>
    </Demo>
  );
};

/* Four widths ---------------------------------------------------------------- */

type Column = "delay" | "name" | "template" | "open" | "click" | "sent";

const COLUMNS: ColumnSpec<Column>[] = [
  { key: "delay", label: "Delay", span: 1, priority: 5 },
  { key: "name", label: "Email", span: 2, priority: 10, flexible: true },
  { key: "template", label: "Template", span: 2, priority: 3 },
  { key: "sent", label: "Sent", span: 1, priority: 6 },
  { key: "click", label: "Click rate", span: 1, priority: 7 },
  { key: "open", label: "Open rate", span: 1, priority: 8 },
];

const EMAILS = [
  { delay: "—", name: "Welcome email", template: "Onboarding", sent: "2,140", click: "4.1%", open: "48%" },
  { delay: "+72h", name: "Getting started guide", template: "Onboarding", sent: "1,980", click: "3.6%", open: "41%" },
  { delay: "+72h", name: "Tips & tricks", template: "Digest", sent: "1,870", click: "2.9%", open: "37%" },
];

const WINDOW = { line: 16, minColumn: 56 };
const WINDOW_HEIGHT = 224;

const cell = (within: [number, number]): CSSProperties => ({
  gridColumn: `${within[0]} / span ${within[1]}`,
});

/** A table on the container's columns, keeping the ones it has room for. */
const WindowTable = () => {
  const { raster, content } = useRaster();
  const columns = allocateColumns(content.main[1], COLUMNS);
  const row = raster.line * 2;

  return (
    <Band>
      <Area area="head">
        <Row height={row}>
          <Text className="text-neutral-950">Phase 1</Text>
        </Row>
        {content.head && (
          <Row height={row}>
            <Text className="text-neutral-500">72h interval</Text>
          </Row>
        )}
      </Area>
      <Area area="main" className="grid grid-cols-subgrid">
        {columns.map((column) => (
          <Row height={row} key={column.key} style={cell(column.within)}>
            <Text className="truncate text-neutral-500">{column.label}</Text>
          </Row>
        ))}
        {EMAILS.map((email) => (
          <div className="col-span-full grid grid-cols-subgrid" key={email.name}>
            {columns.map((column) => (
              <Row height={row} key={column.key} style={cell(column.within)}>
                <Text className={cn("truncate", column.key === "name" ? "text-neutral-950" : "text-neutral-600 tabular-nums")}>
                  {email[column.key]}
                </Text>
              </Row>
            ))}
          </div>
        ))}
      </Area>
    </Band>
  );
};

const WindowNav = () => (
  <nav aria-label="Sequences" className="flex h-full flex-col" style={{ paddingTop: WINDOW.line * 2, lineHeight: `${WINDOW.line}px` }}>
    {["All sequences", "Active campaigns", "Drafts", "Templates"].map((label, index) => (
      <Row className="relative" height={WINDOW.line + 8} key={label}>
        {index === 1 && <Mark className="absolute top-0.5 -left-3.5 bg-action" />}
        <Text className={cn("truncate", index === 1 ? "text-neutral-950" : "text-neutral-600")}>{label}</Text>
      </Row>
    ))}
  </nav>
);

const MIN_WIDTH = 320;

/**
 * The window at real pixels with its right edge loose: drag it narrower and
 * the column count steps down, the navigation goes below eight columns, and
 * the table keeps its most important columns.
 */
export const WidthsFigure = () => {
  const [ref, available] = useWidth();
  const [dragged, setDragged] = useState<number | null>(null);
  const width = Math.round(clamp(dragged ?? available, MIN_WIDTH, available));
  const raster = computeRaster(width, WINDOW);

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.type === "pointerdown") event.currentTarget.setPointerCapture(event.pointerId);
    else if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const box = ref.current?.getBoundingClientRect();
    if (box) setDragged(event.clientX - box.left);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 16;
    if (event.key === "ArrowLeft") setDragged(width - step);
    else if (event.key === "ArrowRight") setDragged(width + step);
    else return;
    event.preventDefault();
  };

  return (
    <Demo caption="Drag the window's edge. Blue is the window's grid, red the container's. The navigation folds away below eight columns and the table drops its least important columns first. From 1744px the window takes 24 columns.">
      <div className="p-5 md:p-6">
        <p className="mb-2 text-neutral-950/60 text-xs tabular-nums">
          {width}px · {raster.columns} columns
        </p>
        <div ref={ref} className="relative" style={{ height: WINDOW_HEIGHT }}>
          {available > 0 && (
            <>
              <div inert className="absolute inset-y-0 left-0 overflow-hidden rounded-md border border-neutral-950/10" style={{ width }}>
                <Theme className={cn(fonts, "bg-neutral-50")} style={{ height: WINDOW_HEIGHT }}>
                  <RasterViewport containerMax={1280} height={WINDOW_HEIGHT} nav={<WindowNav />} overlay params={WINDOW}>
                    <WindowTable />
                  </RasterViewport>
                </Theme>
              </div>
              <div
                aria-label="Window width"
                aria-valuemax={Math.round(available)}
                aria-valuemin={MIN_WIDTH}
                aria-valuenow={width}
                className="group absolute inset-y-0 flex w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center outline-none"
                onKeyDown={onKey}
                onPointerDown={onPointer}
                onPointerMove={onPointer}
                role="slider"
                style={{ left: width }}
                tabIndex={0}
              >
                <span className="h-10 w-1.5 rounded-full bg-neutral-950/25 transition-colors group-hover:bg-neutral-950/50 group-focus-visible:bg-neutral-950/50 group-active:bg-neutral-950/60" />
              </div>
            </>
          )}
        </div>
      </div>
    </Demo>
  );
};

/* Short and long ------------------------------------------------------------- */

const LENGTHS = [
  { label: "Short description", text: "Build the sequence by adding emails and grouping them into phases." },
  { label: "Long description", text: `${COPY} ${COPY}` },
];

/** One block twice, with a short and a long description, on the same baselines. */
const LengthBlock = ({ text }: { text: string }) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState(1);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const measure = () => setLines(Math.max(1, Math.ceil(element.scrollHeight / LINE)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col" style={{ gap: LINE }}>
      <span className="rx text-neutral-500">Description</span>
      {/* The box is the paragraph rounded up to whole lines, so the rows below land on the grid */}
      <div style={{ height: lines * LINE }}>
        <p className="rx m-0" ref={textRef}>
          {text}
        </p>
      </div>
      <span className="rx text-neutral-500">Phase 1 · 72h interval</span>
      {["Welcome email", "Getting started guide", "Tips & tricks"].map((email, index) => (
        <div className="flex gap-4" key={email} style={{ height: LINE }}>
          <span className="rx w-4 text-neutral-500 tabular-nums">{index + 1}</span>
          <span className="rx">{email}</span>
        </div>
      ))}
    </div>
  );
};

export const LengthsFigure = () => (
  <Demo caption="The same block with a short and a long description. The text takes whole lines, so the rows under it stay on the baselines.">
    <Theme
      className={cn(fonts, "grid gap-x-8 gap-y-8 bg-neutral-50 text-[13px] text-neutral-950 md:grid-cols-2")}
      style={{ backgroundImage: baselineGrid(LINE), padding: `${LINE * 2}px ${LINE * 2}px`, lineHeight: `${LINE}px` }}
    >
      {LENGTHS.map(({ label, text }) => (
        <section aria-label={label} key={label}>
          <LengthBlock text={text} />
        </section>
      ))}
    </Theme>
  </Demo>
);

/* Borders ----------------------------------------------------------------------- */

const SCREEN = { width: 1280, height: 640 };

/** The sequence screen as it is now, with a few borders brought back. */
export const BordersFigure = () => {
  const [ref, available] = useWidth();
  const scale = available / SCREEN.width;

  return (
    <Demo caption="The current version, with a few borders brought back.">
      <div ref={ref} inert className="relative overflow-hidden" style={{ height: SCREEN.height * scale }}>
        {scale > 0 && (
          <div className="absolute top-0 left-0 origin-top-left" style={{ width: SCREEN.width, height: SCREEN.height, transform: `scale(${scale})` }}>
            <Theme className={cn(fonts, "h-full overflow-hidden bg-neutral-50")}>
              <SequenceRaster containerMax={1280} density="figma" height={SCREEN.height} overlay={false} params={{ line: 16, minColumn: 64 }} />
            </Theme>
          </div>
        )}
      </div>
    </Demo>
  );
};

/* The app ----------------------------------------------------------------------- */

const APP_HEIGHT = 560;
const APP_PARAMS = { line: 16, minColumn: 64 };
const BAR = 48;

// Moving an element out of the page and back resets its scrolling, so carry it over
const moveKeepingScroll = (node: HTMLElement, slot: HTMLElement) => {
  const scrolled = [node, ...node.querySelectorAll<HTMLElement>("*")]
    .filter((element) => element.scrollTop || element.scrollLeft)
    .map((element) => [element, element.scrollTop, element.scrollLeft] as const);
  slot.append(node);
  for (const [element, top, left] of scrolled) {
    element.scrollTop = top;
    element.scrollLeft = left;
  }
};

const IconButton = ({
  label,
  isPressed,
  onClick,
  children,
}: {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    aria-label={label}
    aria-pressed={isPressed}
    className="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-950/60 transition-colors duration-200 hover:bg-neutral-950/5 hover:text-neutral-950 aria-pressed:bg-neutral-950/5 aria-pressed:text-neutral-950 [&_svg]:size-4"
    onClick={onClick}
    title={label}
    type="button"
  >
    {children}
  </button>
);

const AppBar = ({ isOpen, hasGrid, onGrid, onToggle }: { isOpen: boolean; hasGrid: boolean; onGrid: () => void; onToggle: () => void }) => (
  <div className="flex shrink-0 items-center gap-1 border-neutral-950/10 border-b pr-3 pl-5" style={{ height: BAR }}>
    <span className="min-w-0 flex-1 truncate text-neutral-950/60 text-xs">Email campaign tool</span>
    <IconButton isPressed={hasGrid} label="Show the grid" onClick={onGrid}>
      <Grid3x3 />
    </IconButton>
    <IconButton label={isOpen ? "Close" : "Open larger"} onClick={onToggle}>
      {isOpen ? <Minimize2 /> : <Maximize2 />}
    </IconButton>
  </div>
);

/** The email tool, filling whatever holds it and laid out for that size. */
const AppContent = ({ hasGrid }: { hasGrid: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    // The app scrolls down only; the raster always fits its width
    <Theme ref={ref} className={cn(fonts, "h-full overflow-y-auto overflow-x-hidden bg-neutral-50")}>
      {height > 0 && (
        <SequenceRaster containerMax={1280} density="lots" height={height} overlay={hasGrid} params={APP_PARAMS} />
      )}
    </Theme>
  );
};

/**
 * One instance of the email tool, filled with far more content than the Figma
 * screens. Opening it moves the app into a large panel over a dimmed page,
 * where it lays itself out for the bigger size; it renders into an element of
 * its own that moves between the two, so it keeps whatever was done in it.
 */
export const RasterApp = () => {
  const inlineRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [hasGrid, setHasGrid] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const element = document.createElement("div");
    element.className = "h-full";
    setHost(element);
  }, []);

  useLayoutEffect(() => {
    if (host && inlineRef.current && !host.parentNode) inlineRef.current.append(host);
  }, [host]);

  // Into the panel as soon as it exists, before it paints
  const placeInPanel = (slot: HTMLDivElement | null) => {
    if (host && slot && host.parentNode !== slot) moveKeepingScroll(host, slot);
  };

  const close = () => {
    if (host && inlineRef.current) moveKeepingScroll(host, inlineRef.current);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  });

  // The page holds still while the panel is up. Locked on the root, as the
  // site's app layer does, so the post's sticky index stays where it is
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const { overflow } = root.style;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [isOpen]);

  const toggleGrid = () => setHasGrid((current) => !current);

  return (
    <Demo caption="The email tool with hundreds of emails in it. Scroll through it, or open it larger.">
      <AppBar hasGrid={hasGrid} isOpen={false} onGrid={toggleGrid} onToggle={() => setIsOpen(true)} />
      <div ref={inlineRef} style={{ height: APP_HEIGHT }} />
      {host && createPortal(<AppContent hasGrid={hasGrid} />, host)}
      {isOpen &&
        createPortal(
          <>
            <div aria-hidden className="fixed inset-0 z-50 bg-neutral-950/50" onClick={close} />
            <div
              aria-label="Email campaign tool"
              aria-modal
              className="fixed inset-0 z-50 m-auto flex h-[90dvh] w-[min(1440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-4xl border border-neutral-950/10 bg-neutral-50"
              role="dialog"
            >
              <AppBar hasGrid={hasGrid} isOpen onGrid={toggleGrid} onToggle={close} />
              <div className="min-h-0 flex-1" ref={placeInPanel} />
            </div>
          </>,
          document.body,
        )}
    </Demo>
  );
};

/* Cover ------------------------------------------------------------------------- */

const useSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
};

const STAGE = { width: 2000, height: 1400 };
const PLANE = { width: 1440, height: 900, lift: 220, radius: 32 };
const COVER_PARAMS = { line: 16, minColumn: 64 };
const planeRaster = computeRaster(PLANE.width, COVER_PARAMS);

/** One layer of the screen, lifted above the one below, with its name beside it. */
const Plane = ({ level, label, children }: { level: number; label: string; children: ReactNode }) => (
  <div
    className="absolute inset-0"
    style={{
      transform: `translateZ(${level * PLANE.lift}px)`,
      borderRadius: PLANE.radius,
      outline: "1px solid rgb(13 13 12 / 0.14)",
    }}
  >
    <span
      className="absolute top-0 right-full mr-12 whitespace-nowrap"
      style={{ fontFamily: "var(--font-geist)", fontSize: 40, lineHeight: 1, color: "#8a8784" }}
    >
      {label}
    </span>
    <div className="size-full overflow-hidden" style={{ borderRadius: PLANE.radius }}>
      {children}
    </div>
  </div>
);

/**
 * The cover: the sequence screen taken apart into its content, its columns and
 * its baselines, stacked at the same angle as the design system's work table.
 */
export const GridCover = () => {
  const [ref, size] = useSize();
  const scale = size.width > 0 ? Math.max(size.width / STAGE.width, size.height / STAGE.height) : 0;
  const left = (size.width - STAGE.width * scale) / 2;
  const top = (size.height - STAGE.height * scale) / 2;

  return (
    <div ref={ref} inert className="absolute inset-0 overflow-hidden bg-[#f5f5f4]">
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: STAGE.width, height: STAGE.height, transform: `translate(${left}px, ${top}px) scale(${scale})` }}
        >
          <Theme className={cn(fonts, "relative size-full")} style={{ background: "transparent" }}>
            <div
              className="absolute"
              style={{
                left: STAGE.width / 2,
                top: 820,
                width: PLANE.width,
                height: PLANE.height,
                transform: "translate(-50%, -50%) rotateX(55deg) rotateZ(-38deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <Plane label="Content" level={0}>
                <div className="size-full bg-neutral-50">
                  <SequenceRaster containerMax={1280} density="figma" height={PLANE.height} overlay={false} params={COVER_PARAMS} />
                </div>
              </Plane>
              <Plane label={`${planeRaster.columns} columns`} level={1}>
                {Array.from({ length: planeRaster.columns }, (_, index) => (
                  <div
                    className="absolute inset-y-0"
                    // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
                    key={index}
                    style={{
                      left: planeRaster.margin + index * (planeRaster.column + planeRaster.gutter),
                      width: planeRaster.column,
                      backgroundColor: "rgb(242 72 34 / 0.16)",
                    }}
                  />
                ))}
              </Plane>
              <Plane label="4 px baseline" level={2}>
                <div
                  className="size-full"
                  style={{
                    backgroundImage: [
                      "repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.55) 0 1px, transparent 1px 16px)",
                      "repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.16) 0 1px, transparent 1px 4px)",
                    ].join(", "),
                  }}
                />
              </Plane>
            </div>
          </Theme>
        </div>
      )}
    </div>
  );
};
