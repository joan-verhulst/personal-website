import type { ComponentProps } from 'react';
import { resolveChartColor } from '../lib/chart';
import { cn } from '../lib/cn';
import { Badge } from './badge';

export type FunnelStep = {
    /** The step's path, e.g. '/checkout'. */
    label: string;
    value: number;
    /** Change against the previous period, in percent. */
    delta?: number;
};

export type FunnelChartProps = Omit<ComponentProps<'div'>, 'children'> & {
    steps: FunnelStep[];
    /** One colour per step: any CSS colour, or a data colour name such as 'chart-1'. */
    colors?: string[];
    height?: number;
    formatValue?: (value: number) => string;
};

const defaultColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4'];

// Room the label cards take at the bottom of each column: card plus its 12px margins.
const CARD_SPACE = 80;
const HALO = 8;
const COLUMN = 100;
const EASE = 40;

const bandPath = (x0: number, centre: number, from: number, to: number) => {
    const x1 = x0 + COLUMN;
    const mid = x0 + EASE / 2;
    const end = x0 + EASE;
    return [
        `M${x0},${centre - from}`,
        `C${mid},${centre - from} ${mid},${centre - to} ${end},${centre - to}`,
        `L${x1},${centre - to}`,
        `L${x1},${centre + to}`,
        `L${end},${centre + to}`,
        `C${mid},${centre + to} ${mid},${centre + from} ${x0},${centre + from}`,
        'Z',
    ].join('');
};

const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * The checkout funnel from the analytics screens: one column per step, a band
 * whose thickness follows the share still in the funnel, easing down at the
 * start of each column, with a label card at the bottom.
 */
export const FunnelChart = ({
    steps,
    colors = defaultColors,
    height = 384,
    formatValue = value => value.toLocaleString('en-US'),
    className,
    style,
    ...props
}: FunnelChartProps) => {
    const first = steps[0]?.value || 1;
    const plotHeight = Math.max(0, height - CARD_SPACE);
    const centre = plotHeight / 2;
    const maxHalf = Math.min(height * 0.45, plotHeight - HALO * 4) / 2;
    const half = (value: number) => Math.max(1, (Math.max(0, value) / first) * maxHalf);
    const colorOf = (i: number) => resolveChartColor(colors[i % colors.length] ?? 'chart-1');

    return (
        <div
            className={cn(
                'relative grid overflow-hidden rounded-card border border-neutral-200 bg-neutral-100',
                className,
            )}
            data-slot="funnel-chart"
            style={{
                height,
                gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0, 1fr))`,
                ...style,
            }}
            {...props}
        >
            <svg
                aria-hidden="true"
                className="absolute inset-x-0 top-0 w-full"
                height={plotHeight}
                preserveAspectRatio="none"
                viewBox={`0 0 ${Math.max(1, steps.length) * COLUMN} ${plotHeight}`}
            >
                {steps.map((step, i) => {
                    const to = half(step.value);
                    const from = i === 0 ? to : half(steps[i - 1]?.value ?? step.value);
                    const fill = colorOf(i);
                    return (
                        <g key={`${step.label}-${i}`} style={{ fill }}>
                            <path
                                d={bandPath(i * COLUMN, centre, from + HALO, to + HALO)}
                                fillOpacity={0.33}
                            />
                            <path d={bandPath(i * COLUMN, centre, from, to)} />
                        </g>
                    );
                })}
            </svg>

            {steps.map((step, i) => (
                <div
                    className="relative flex min-w-0 flex-col justify-end border-neutral-950/5 border-r last:border-r-0"
                    data-slot="funnel-step"
                    key={`${step.label}-${i}`}
                >
                    <div className="m-3 flex items-center justify-between gap-4 rounded-card border border-neutral-100 bg-neutral-50 py-3 pr-4 pl-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-normal text-neutral-700 text-xxs">
                                {step.label}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-neutral-950 text-xs tabular-nums">
                                <span
                                    className="h-3 w-0.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: colorOf(i) }}
                                />
                                <span className="truncate">
                                    {percent.format((step.value / first) * 100)}% ·{' '}
                                    {formatValue(step.value)}
                                </span>
                            </span>
                        </div>
                        {step.delta != null && (
                            <Badge
                                className="tabular-nums"
                                tone={step.delta < 0 ? 'error' : 'success'}
                                variant="pill"
                            >
                                {step.delta > 0 ? '+' : ''}
                                {percent.format(step.delta)}%
                            </Badge>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
