'use client';

import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { resolveChartColor } from '../lib/chart';
import { cn } from '../lib/cn';

export type AreaChartDatum = { label: string; value: number };

export type AreaChartSeries = {
    key: string;
    values: number[];
    /** Any CSS colour, or a data colour name such as 'chart-1'. */
    color?: string;
};

export type AreaChartProps = Omit<ComponentProps<'div'>, 'children'> & {
    /** A single series with its own x labels. */
    data?: AreaChartDatum[];
    /** Several series sharing `labels`; drawn in order, the last on top. */
    series?: AreaChartSeries[];
    labels?: string[];
    /** Colour of the `data` series. */
    color?: string;
    yTicks?: number[] | 'auto';
    height?: number;
    formatY?: (value: number) => string;
    /** Marks one x position with a dashed rule and an icon disc at the top. */
    annotation?: { index: number; icon?: ReactNode };
};

type Point = { x: number; y: number };

const seriesColors = ['chart-5', 'chart-1', 'chart-2', 'chart-3', 'chart-4'];

export { resolveChartColor };

// Width of one 13px tabular figure: the tick labels' column is sized to the
// longest label, so short labels start at the chart's edge instead of floating.
const FIGURE_WIDTH = 7.5;
const LABEL_GAP = 8;
const PLOT_TOP = 8;
const X_AXIS_HEIGHT = 32;

const niceStep = (rough: number) => {
    const power = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / power;
    const nice =
        fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * power;
};

const autoTicks = (values: number[]) => {
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    if (max === min) return [0, 1];

    const step = niceStep((max - min) / 4);
    const ticks: number[] = [];
    for (let i = Math.floor(min / step); i <= Math.ceil(max / step); i++) {
        ticks.push(Number((i * step).toFixed(10)));
    }
    return ticks;
};

/**
 * Monotone cubic interpolation (Fritsch–Carlson, as d3's curveMonotoneX): a
 * smooth curve that never overshoots the data, so a peak stays the peak.
 */
export const monotonePath = (points: Point[]) => {
    const n = points.length;
    const first = points[0];
    if (!first) return '';
    if (n === 1) return `M${first.x},${first.y}`;

    const slopes: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        const a = points[i] as Point;
        const b = points[i + 1] as Point;
        slopes.push((b.y - a.y) / (b.x - a.x || 1));
    }

    const tangents = new Array<number>(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        const s0 = slopes[i - 1] as number;
        const s1 = slopes[i] as number;
        const h0 = (points[i] as Point).x - (points[i - 1] as Point).x;
        const h1 = (points[i + 1] as Point).x - (points[i] as Point).x;
        const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
        tangents[i] =
            (Math.sign(s0) + Math.sign(s1)) *
                Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
    }
    if (n === 2) {
        tangents[0] = slopes[0] as number;
        tangents[1] = slopes[0] as number;
    } else {
        tangents[0] = (3 * (slopes[0] as number) - (tangents[1] as number)) / 2;
        tangents[n - 1] = (3 * (slopes[n - 2] as number) - (tangents[n - 2] as number)) / 2;
    }

    let d = `M${first.x},${first.y}`;
    for (let i = 0; i < n - 1; i++) {
        const a = points[i] as Point;
        const b = points[i + 1] as Point;
        const dx = (b.x - a.x) / 3;
        d += `C${a.x + dx},${a.y + dx * (tangents[i] as number)} ${b.x - dx},${b.y - dx * (tangents[i + 1] as number)} ${b.x},${b.y}`;
    }
    return d;
};

/**
 * The analytics overview's sessions chart: hairline gridlines with labels in a
 * column as wide as the longest one, each day label under its own point, and
 * each series a 1px curve over a fill that fades from 33% to nothing.
 */
export const AreaChart = ({
    data,
    series,
    labels,
    color = 'chart-5',
    yTicks = 'auto',
    height = 240,
    formatY = value => value.toLocaleString(),
    annotation,
    className,
    style,
    'aria-label': ariaLabel = 'Area chart',
    ...props
}: AreaChartProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const id = `pds-area-${useId().replace(/[^\w-]/g, '')}`;

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        setWidth(node.clientWidth);
        const observer = new ResizeObserver(([entry]) => {
            if (entry) setWidth(entry.contentRect.width);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const lines: AreaChartSeries[] =
        series ?? (data ? [{ key: 'value', values: data.map(d => d.value), color }] : []);
    const xLabels = labels ?? data?.map(d => d.label) ?? [];
    const count = Math.max(xLabels.length, ...lines.map(line => line.values.length), 1);

    const ticks = yTicks === 'auto' ? autoTicks(lines.flatMap(line => line.values)) : yTicks;
    const domainMin = Math.min(...ticks);
    const domainMax = Math.max(...ticks);
    const span = domainMax - domainMin || 1;

    const labelWidth = Math.ceil(
        Math.max(...ticks.map(tick => formatY(tick).length)) * FIGURE_WIDTH,
    );
    const plotLeft = labelWidth + LABEL_GAP;
    const plotBottom = height - X_AXIS_HEIGHT;
    const plotWidth = Math.max(0, width - plotLeft);
    const yOf = (value: number) =>
        plotBottom - ((value - domainMin) / span) * (plotBottom - PLOT_TOP);
    const xOf = (index: number) =>
        plotLeft + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
    const baseline = yOf(Math.min(Math.max(0, domainMin), domainMax));
    const annotationX = annotation ? xOf(annotation.index) : 0;
    const colorOf = (line: AreaChartSeries, i: number) =>
        resolveChartColor(line.color ?? seriesColors[i % seriesColors.length] ?? 'chart-5');

    return (
        <div
            aria-label={ariaLabel}
            className={cn('relative w-full', className)}
            data-slot="area-chart"
            ref={ref}
            role="img"
            style={{ height, ...style }}
            {...props}
        >
            {width > 0 && (
                <svg
                    aria-hidden="true"
                    className="block overflow-visible"
                    height={height}
                    width={width}
                >
                    <defs>
                        {lines.map((line, i) => (
                            <linearGradient
                                id={`${id}-${i}`}
                                key={line.key}
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop
                                    offset="0"
                                    style={{
                                        stopColor: colorOf(line, i),
                                        stopOpacity: 0.33,
                                    }}
                                />
                                <stop
                                    offset="1"
                                    style={{
                                        stopColor: colorOf(line, i),
                                        stopOpacity: 0,
                                    }}
                                />
                            </linearGradient>
                        ))}
                    </defs>

                    {ticks.map(tick => {
                        const y = Math.round(yOf(tick)) + 0.5;
                        return (
                            <g key={tick}>
                                <line
                                    className="stroke-neutral-200"
                                    x1={plotLeft}
                                    x2={width}
                                    y1={y}
                                    y2={y}
                                />
                                <text
                                    className="fill-neutral-600 text-xs"
                                    dominantBaseline="central"
                                    textAnchor="end"
                                    x={labelWidth}
                                    y={y}
                                >
                                    {formatY(tick)}
                                </text>
                            </g>
                        );
                    })}

                    {xLabels.map((label, i) => {
                        // Each label under its own point: the first starts there,
                        // the last ends there, the rest are centred on theirs.
                        const x = xOf(i);
                        const anchor =
                            count > 1 && i === 0
                                ? 'start'
                                : count > 1 && i === count - 1
                                  ? 'end'
                                  : 'middle';
                        return (
                            <text
                                className="fill-neutral-600 text-xs"
                                dominantBaseline="central"
                                key={x}
                                textAnchor={anchor}
                                x={x}
                                y={plotBottom + 24}
                            >
                                {label}
                            </text>
                        );
                    })}

                    {lines.map((line, i) => {
                        const points = line.values.map((value, index) => ({
                            x: xOf(index),
                            y: yOf(value),
                        }));
                        const first = points[0];
                        const last = points[points.length - 1];
                        if (!first || !last) return null;
                        const curve = monotonePath(points);
                        const stroke = colorOf(line, i);

                        return (
                            <g key={line.key}>
                                <path
                                    d={`${curve}L${last.x},${baseline}L${first.x},${baseline}Z`}
                                    fill={`url(#${id}-${i})`}
                                />
                                <path d={curve} fill="none" style={{ stroke }} strokeWidth={1} />
                            </g>
                        );
                    })}

                    {annotation && (
                        <line
                            className="stroke-neutral-950/25"
                            strokeDasharray="8 8"
                            x1={Math.round(annotationX) + 0.5}
                            x2={Math.round(annotationX) + 0.5}
                            y1={PLOT_TOP}
                            y2={baseline}
                        />
                    )}
                </svg>
            )}

            {annotation && width > 0 && (
                <div
                    className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-950 [&_svg]:size-4 [&_svg]:shrink-0"
                    data-slot="area-chart-annotation"
                    style={{ left: annotationX, top: PLOT_TOP }}
                >
                    {annotation.icon}
                </div>
            )}
        </div>
    );
};
