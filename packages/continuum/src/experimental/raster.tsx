'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    type ComponentProps,
    type CSSProperties,
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { cn } from '../lib/cn';
import {
    areasFor,
    BODY_CAP_ON_GRID,
    baselineIn,
    computeRaster,
    containerFor,
    gridColumn,
    navColumnsFor,
    type Raster,
    type RasterParams,
    type Span,
} from './engine';

type RasterValue = { raster: Raster; content: { head?: Span; main: Span } };

const RasterContext = createContext<RasterValue | null>(null);

export const useRaster = () => {
    const value = useContext(RasterContext);
    if (!value) throw new Error('useRaster needs a RasterViewport');
    return value;
};

const OuterContext = createContext<Raster | null>(null);

/** The viewport's own grid, the one the navigation is sized on. */
export const useOuterRaster = () => {
    const value = useContext(OuterContext);
    if (!value) throw new Error('useOuterRaster needs a RasterViewport');
    return value;
};

const useWidth = (initial: number) => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(initial);

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

type RasterViewportProps = {
    params: RasterParams;
    /** Widest the inner container may get; it steps down from here. */
    containerMax: number;
    /** Height of the scrolling frame, so the navigation can fill it. */
    height: number;
    overlay?: boolean;
    nav?: ReactNode;
    children: ReactNode;
};

/**
 * Grids in grids, the way the screens are set up in Figma. The viewport has a
 * raster of its own that sizes the navigation in whole columns; the space
 * beside it holds a container that steps 1440, 1280, 1024, 768, then goes
 * fluid, with its own raster for the page.
 */
export const RasterViewport = ({
    params,
    containerMax,
    height,
    overlay,
    nav,
    children,
}: RasterViewportProps) => {
    const [ref, width] = useWidth(1920);

    const outer = computeRaster(width, params);
    const navColumns = nav ? navColumnsFor(outer.columns) : 0;

    return (
        <div className="relative min-h-full" ref={ref}>
            <OuterContext.Provider value={outer}>
                <div
                    className="relative grid min-h-full"
                    style={{
                        gridTemplateColumns: `repeat(${outer.columns}, minmax(0, 1fr))`,
                        columnGap: outer.gutter,
                        paddingInline: outer.margin,
                    }}
                >
                    {overlay && (
                        <ColumnOverlay className="bg-[rgb(13_153_255/0.06)]" raster={outer} />
                    )}
                    {navColumns > 0 && (
                        <div
                            className="sticky top-0 self-start"
                            style={{
                                gridColumn: `1 / span ${navColumns}`,
                                height,
                            }}
                        >
                            {nav}
                        </div>
                    )}
                    <div className="min-w-0" style={{ gridColumn: `${navColumns + 1} / -1` }}>
                        <RasterGrid containerMax={containerMax} overlay={overlay} params={params}>
                            {children}
                        </RasterGrid>
                    </div>
                </div>
            </OuterContext.Provider>
        </div>
    );
};

type RasterGridProps = {
    params: RasterParams;
    containerMax: number;
    overlay?: boolean;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
};

/**
 * The page's container grid on its own: it measures the space it is given,
 * picks the container step that fits and lays its own columns over it. The
 * raster viewport sits it beside its navigation.
 */
export const RasterGrid = ({
    params,
    containerMax,
    overlay,
    className,
    style,
    children,
}: RasterGridProps) => {
    const [ref, available] = useWidth(1280);
    const container = containerFor(available, containerMax);
    const inner = computeRaster(container, params);
    const areas = areasFor(inner.columns);

    return (
        <div className="min-w-0" ref={ref}>
            <RasterContext.Provider value={{ raster: inner, content: areas }}>
                <div
                    className={cn('relative mx-auto grid content-start', className)}
                    style={
                        {
                            '--rx-line': `${inner.line}px`,
                            width: container,
                            gridTemplateColumns: `repeat(${inner.columns}, minmax(0, 1fr))`,
                            columnGap: inner.gutter,
                            paddingInline: inner.margin,
                            paddingTop: inner.line * 2,
                            lineHeight: `${inner.line}px`,
                            ...style,
                        } as CSSProperties
                    }
                >
                    {overlay && <ColumnOverlay baselines raster={inner} />}
                    {children}
                </div>
            </RasterContext.Provider>
        </div>
    );
};

/** A horizontal band across the container's columns; its children place themselves. */
export const Band = ({ className, ...props }: ComponentProps<'div'>) => (
    <div className={cn('col-span-full grid grid-cols-subgrid', className)} {...props} />
);

type AreaProps = ComponentProps<'div'> & {
    area: 'head' | 'main' | 'all';
    /** A slice of the area's columns, counted from its own first column. */
    within?: Span;
};

/**
 * Places a block in the labels' or the content's columns. Without room for
 * hanging labels, a label stacks above its content one line apart.
 */
export const Area = ({ area, within, className, style, ...props }: AreaProps) => {
    const { content } = useRaster();
    const span = area === 'head' ? (content.head ?? content.main) : content.main;
    const placed: Span = within ? [span[0] + within[0] - 1, within[1]] : span;
    const stacked = area === 'head' && !content.head;

    return (
        <div
            className={cn('min-w-0', stacked && 'mb-[var(--rx-line)]', className)}
            style={{ gridColumn: area === 'all' ? '1 / -1' : gridColumn(placed), ...style }}
            {...props}
        />
    );
};

type RowProps = ComponentProps<'div'> & {
    /** Row height in px; text in it is centred with its baseline on the grid. */
    height: number;
};

/** A fixed-height row whose single line of text sits on the baseline grid. */
export const Row = ({ height, className, style, ...props }: RowProps) => (
    <div
        className={cn('flex min-w-0 items-start', className)}
        style={{ height, paddingTop: baselineIn(height) - BODY_CAP_ON_GRID, ...style }}
        {...props}
    />
);

/**
 * Trimmed to its cap height and baseline, then nudged down so the cap tops out
 * just under a grid line: every line of it lands on the baseline grid.
 */
export const Text = ({
    as: Tag = 'span',
    className,
    children,
}: {
    as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'dt' | 'dd';
    className?: string;
    children: ReactNode;
}) => <Tag className={cn('rx block', className)}>{children}</Tag>;

type RuleProps = {
    /** Which columns the rule runs across: the labels and content, or the content alone. */
    area?: 'all' | 'main';
    className?: string;
    style?: CSSProperties;
};

/**
 * A hairline between sections, used sparingly. It overlaps the next line by
 * its own pixel, so it takes no height and the baseline grid runs through it.
 */
export const Rule = ({ area = 'all', className, style }: RuleProps) => (
    <Band style={style}>
        <Area area={area}>
            <div aria-hidden className={cn('-mb-px h-px bg-neutral-200', className)} />
        </Area>
    </Band>
);

type PanelProps = ComponentProps<'div'> & {
    area: 'head' | 'main' | 'all';
    within?: Span;
};

/**
 * A card for the few groups that are one thing (a figure, a chart, the totals).
 * Its hairline is an inset ring rather than a border and its padding is a whole
 * line, so nothing inside leaves the baseline grid. Same small corner as every
 * other raster control.
 */
export const Panel = ({ className, style, ...props }: PanelProps) => {
    const { raster } = useRaster();

    return (
        <Area
            className={cn(
                'rounded-chip shadow-[inset_0_0_0_1px_var(--pds-neutral-200)]',
                className,
            )}
            style={{ padding: raster.line, ...style }}
            {...props}
        />
    );
};

type RasterInputProps = Omit<ComponentProps<'input'>, 'size'> & {
    /** A 16px icon before the text, in the muted text colour. */
    leadingIcon?: ReactNode;
};

/**
 * A text field in the raster's own terms: 13px regular like the text around it,
 * two lines tall, drawn with the same inset hairline as a Panel or a Rule. The
 * hairline darkens on hover and turns to ink while typing; there is no glow.
 */
export const RasterInput = ({ leadingIcon, className, ...props }: RasterInputProps) => (
    <label
        className={cn(
            'flex h-8 w-full min-w-0 cursor-text items-center gap-2 rounded-chip px-curve text-neutral-500 [--curve-base:6.5px] [--curve-height:32px] [--curve-radius:var(--pds-radius-chip)]',
            'shadow-[inset_0_0_0_1px_var(--pds-neutral-200)] transition-shadow duration-150',
            'hover:shadow-[inset_0_0_0_1px_var(--pds-neutral-300)]',
            'focus-within:text-neutral-950 focus-within:shadow-[inset_0_0_0_1px_var(--pds-neutral-950)]',
            '[&_svg]:size-4 [&_svg]:shrink-0',
            className,
        )}
    >
        {leadingIcon}
        <input
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-neutral-950 leading-4 outline-none placeholder:text-neutral-500"
            {...props}
        />
    </label>
);

/** Keyboard focus as an ink hairline just outside the control, never a glow. */
const rasterFocus =
    'outline-none focus-visible:outline-1 focus-visible:outline-neutral-950 focus-visible:outline-offset-2';

const rasterButtonVariants = {
    // The one filled control: the action colour, flat, no gloss or shadow.
    primary: 'bg-action text-on-action hover:bg-action-hover',
    secondary:
        'text-neutral-950 shadow-[inset_0_0_0_1px_var(--pds-neutral-200)] hover:shadow-[inset_0_0_0_1px_var(--pds-neutral-400)]',
    ghost: 'text-neutral-600 hover:bg-neutral-950/[0.05] hover:text-neutral-950',
};

const rasterButtonSizes = {
    md: 'h-8 px-curve [--curve-base:10.5px] [--curve-radius:var(--pds-radius-chip)] [--curve-height:32px]',
    icon: 'size-8',
    'icon-sm': 'size-7',
};

type RasterButtonProps = ComponentProps<'button'> & {
    variant?: keyof typeof rasterButtonVariants;
    size?: keyof typeof rasterButtonSizes;
};

/**
 * A button in the raster's own terms: two lines tall, 13px regular like the
 * text around it, the same small corner and inset hairline as the input and
 * the panels. Only the primary one is filled.
 */
export const RasterButton = ({
    variant = 'primary',
    size = 'md',
    className,
    type = 'button',
    ...props
}: RasterButtonProps) => (
    <button
        className={cn(
            'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-chip font-normal text-[13px] leading-4 transition-[background-color,box-shadow,color] duration-150',
            'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
            rasterButtonVariants[variant],
            rasterButtonSizes[size],
            rasterFocus,
            className,
        )}
        type={type}
        {...props}
    />
);

type SegmentedValue = { value: string; select: (value: string) => void };

const SegmentedContext = createContext<SegmentedValue | null>(null);

type RasterSegmentedProps = Omit<ComponentProps<'fieldset'>, 'onChange'> & {
    value: string;
    onValueChange: (value: string) => void;
    /** Shares the full width out between the options. */
    fill?: boolean;
};

/**
 * A choice of a few options in one hairline, the options divided by hairlines
 * of their own; the chosen one is washed, not filled.
 */
export const RasterSegmented = ({
    value,
    onValueChange,
    fill,
    className,
    ...props
}: RasterSegmentedProps) => (
    <SegmentedContext.Provider value={{ value, select: onValueChange }}>
        <fieldset
            className={cn(
                'm-0 h-8 min-w-0 max-w-full overflow-hidden rounded-chip border-0 p-0 shadow-[inset_0_0_0_1px_var(--pds-neutral-200)]',
                '[&>*+*]:shadow-[inset_1px_0_0_var(--pds-neutral-200)]',
                fill ? 'flex w-full [&>*]:min-w-0 [&>*]:flex-1' : 'inline-flex w-fit',
                className,
            )}
            {...props}
        />
    </SegmentedContext.Provider>
);

export const RasterSegmentedItem = ({
    value,
    className,
    ...props
}: Omit<ComponentProps<'button'>, 'value'> & { value: string }) => {
    const context = useContext(SegmentedContext);
    const pressed = context?.value === value;

    return (
        <button
            aria-pressed={pressed}
            className={cn(
                'inline-flex h-full cursor-pointer select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-curve font-normal text-[13px] text-neutral-500 leading-4 transition-[background-color,color] duration-150 [--curve-base:10.5px] [--curve-height:32px] [--curve-radius:var(--pds-radius-chip)] hover:text-neutral-950',
                'aria-pressed:bg-neutral-950/[0.06] aria-pressed:text-neutral-950',
                '[&_svg]:size-4 [&_svg]:shrink-0',
                rasterFocus,
                className,
            )}
            onClick={() => context?.select(value)}
            type="button"
            {...props}
        />
    );
};

/**
 * Reveals a long list a step at a time. Changing what the list holds (a new
 * filter, other data) starts it over at the first step.
 */
export const useShowMore = (total: number, step: number, resetKey?: unknown) => {
    const [state, setState] = useState({ key: resetKey, shown: step });
    const shown = state.key === resetKey ? state.shown : step;

    return {
        shown: Math.min(shown, total),
        remaining: Math.max(0, total - shown),
        more: () => setState({ key: resetKey, shown: shown + step }),
        all: () => setState({ key: resetKey, shown: total }),
    };
};

type ShowMoreProps = {
    remaining: number;
    step: number;
    onMore: () => void;
    onAll?: () => void;
    className?: string;
};

/** "Show 20 more · 140 left", and "Show all" when there is more than one step left. */
export const ShowMore = ({ remaining, step, onMore, onAll, className }: ShowMoreProps) =>
    remaining > 0 ? (
        <div className={cn('flex h-8 items-center gap-2', className)}>
            <RasterButton className="-ml-3" onClick={onMore} variant="ghost">
                Show {Math.min(step, remaining)} more
            </RasterButton>
            <span className="text-[13px] text-neutral-500 tabular-nums leading-4">
                {remaining} left
            </span>
            {onAll && remaining > step && (
                <RasterButton onClick={onAll} variant="ghost">
                    Show all
                </RasterButton>
            )}
        </div>
    ) : null;

/** Pages of a long list. Changing what the list holds goes back to the first page. */
export const usePages = (total: number, size: number, resetKey?: unknown) => {
    const [state, setState] = useState({ key: resetKey, page: 1 });
    const pageCount = Math.max(1, Math.ceil(total / size));
    const page = Math.min(state.key === resetKey ? state.page : 1, pageCount);
    const start = (page - 1) * size;

    return {
        page,
        pageCount,
        start,
        end: Math.min(total, start + size),
        total,
        setPage: (next: number) => setState({ key: resetKey, page: next }),
    };
};

/** Page numbers to show: the first, the last, and two either side of the current one. */
const pageItems = (page: number, pageCount: number) => {
    const items: (number | 'gap')[] = [];
    for (let index = 1; index <= pageCount; index++) {
        if (index === 1 || index === pageCount || Math.abs(index - page) <= 1) {
            items.push(index);
        } else if (items.at(-1) !== 'gap') {
            items.push('gap');
        }
    }
    return items;
};

type RasterPaginationProps = ReturnType<typeof usePages> & {
    label?: string;
    className?: string;
};

/**
 * "1–50 of 180" and the pages, in the raster's own controls: plain numbers,
 * the current one washed like a chosen segment.
 */
export const RasterPagination = ({
    page,
    pageCount,
    start,
    end,
    total,
    setPage,
    label = 'Pages',
    className,
}: RasterPaginationProps) =>
    pageCount > 1 ? (
        <nav
            aria-label={label}
            className={cn('flex h-8 items-center justify-between gap-4', className)}
        >
            <span className="text-[13px] text-neutral-500 tabular-nums leading-4">
                {start + 1}–{end} of {total}
            </span>
            <div className="flex items-center gap-1">
                <RasterButton
                    aria-label="Previous page"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    size="icon"
                    variant="ghost"
                >
                    <ChevronLeft strokeWidth={1.5} />
                </RasterButton>
                {pageItems(page, pageCount).map((item, index) =>
                    item === 'gap' ? (
                        <span
                            className="w-6 text-center text-[13px] text-neutral-500 leading-4"
                            // biome-ignore lint/suspicious/noArrayIndexKey: gaps are positional
                            key={`gap-${index}`}
                        >
                            …
                        </span>
                    ) : (
                        <RasterButton
                            aria-current={item === page ? 'page' : undefined}
                            className="min-w-8 px-2 tabular-nums aria-[current=page]:bg-neutral-950/[0.06] aria-[current=page]:text-neutral-950"
                            key={item}
                            onClick={() => setPage(item)}
                            variant="ghost"
                        >
                            {item}
                        </RasterButton>
                    ),
                )}
                <RasterButton
                    aria-label="Next page"
                    disabled={page === pageCount}
                    onClick={() => setPage(page + 1)}
                    size="icon"
                    variant="ghost"
                >
                    <ChevronRight strokeWidth={1.5} />
                </RasterButton>
            </div>
        </nav>
    ) : null;

/** Buttons and inputs, trimmed from 33/34px to 32 so they sit on the grid. */
export const onGrid = 'h-8';

/** A small solid square, the one mark the raster uses for colour and state. */
export const Mark = ({ className, style }: { className?: string; style?: CSSProperties }) => (
    <span aria-hidden className={cn('inline-block size-2 shrink-0', className)} style={style} />
);

/**
 * Columns as Figma draws a layout grid: the viewport's in blue, the
 * container's in red; baselines in blue, every line stronger.
 */
const ColumnOverlay = ({
    raster,
    baselines,
    className = 'bg-[rgb(242_72_34/0.08)]',
}: {
    raster: Raster;
    baselines?: boolean;
    className?: string;
}) => (
    <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 grid"
        style={{
            gridTemplateColumns: `repeat(${raster.columns}, minmax(0, 1fr))`,
            columnGap: raster.gutter,
            paddingInline: raster.margin,
            backgroundImage: baselines
                ? [
                      `repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.35) 0 1px, transparent 1px ${raster.line}px)`,
                      `repeating-linear-gradient(to bottom, rgb(13 153 255 / 0.1) 0 1px, transparent 1px ${raster.quantum}px)`,
                  ].join(', ')
                : undefined,
        }}
    >
        {Array.from({ length: raster.columns }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
            <span className={className} key={index} />
        ))}
    </div>
);
