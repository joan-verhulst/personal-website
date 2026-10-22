/**
 * A raster after Müller-Brockmann, made dynamic after Gerstner.
 *
 * The text line is the unit: gutters, margins and gaps are whole lines, and
 * every baseline sits on a 4px grid. The column count is not fixed but taken
 * from the space available, from a set where each count divides the next, so
 * a layout recombines instead of breaking when the space changes.
 */

export type RasterParams = {
    /** Line height of the 13px body text, and the unit for everything else. */
    line: number;
    /** Narrowest a column may get before the raster drops to fewer columns. */
    minColumn: number;
};

export type Raster = RasterParams & {
    width: number;
    columns: ColumnCount;
    column: number;
    gutter: number;
    margin: number;
    /** The baseline grid every baseline sits on. */
    quantum: number;
};

/** Each count divides the next, so spans keep their proportions across counts. */
export const columnCounts = [24, 12, 8, 4] as const;

export type ColumnCount = (typeof columnCounts)[number];

export const QUANTUM = 4;

// Cap height of 13px Geist and Inter.
const BODY_CAP = 13 * 0.7;

/** The cap height rounded up to the grid: the height of one trimmed line of body text. */
export const BODY_CAP_ON_GRID = Math.ceil(BODY_CAP / QUANTUM) * QUANTUM;

/**
 * Where one line of body text puts its baseline in a row of this height: the
 * cap centred in the row, then the baseline dropped onto the nearest grid line.
 */
export const baselineIn = (height: number) =>
    Math.round((height + BODY_CAP) / 2 / QUANTUM) * QUANTUM;

export const computeRaster = (width: number, params: RasterParams): Raster => {
    const gutter = params.line;
    const margin = params.line;
    const inner = width - margin * 2;
    const columns =
        columnCounts.find(count => count * params.minColumn + (count - 1) * gutter <= inner) ?? 4;
    const column = (inner - (columns - 1) * gutter) / columns;

    return { ...params, width, columns, column, gutter, margin, quantum: QUANTUM };
};

/** A run of columns: where it starts (1-based) and how many it spans. */
export type Span = [start: number, span: number];

/** The outer grid's share for navigation: a sixth of the viewport's columns. */
export const navColumnsFor = (columns: ColumnCount) => {
    if (columns >= 12) return columns / 6;
    if (columns === 8) return 2;
    return 0;
};

/** Container widths the page steps down through before it goes fluid. */
export const containerSteps = [1440, 1280, 1024, 768] as const;

/**
 * The inner container: the widest step that fits the space beside the
 * navigation, never wider than the chosen maximum; below the last step it
 * takes whatever is there.
 */
export const containerFor = (available: number, max: number) =>
    containerSteps.find(step => step <= max && step <= available) ?? available;

export type Areas = {
    /** The column labels hang in; absent when they stack above their content. */
    head?: Span;
    main: Span;
};

/**
 * The container in two columns of columns: hanging labels and content. The
 * labels give way and stack once the raster has too few columns to spare.
 */
export const areasFor = (columns: ColumnCount): Areas => {
    if (columns >= 12) {
        const quarter = columns / 4;
        return { head: [1, quarter], main: [1 + quarter, columns - quarter] };
    }

    if (columns === 8) {
        return { head: [1, 2], main: [3, 6] };
    }

    return { main: [1, columns] };
};

export const gridColumn = ([start, span]: Span) => `${start} / span ${span}`;

export type ColumnSpec<Key extends string = string> = {
    key: Key;
    label: string;
    /** Grid columns it takes at least. */
    span: number;
    /** Higher stays longer; the lowest go first when the columns run out. */
    priority: number;
    /** Takes whatever columns are left over. */
    flexible?: boolean;
};

/**
 * Lays table columns onto the content's grid columns: every column takes whole
 * grid columns, the least important drop out until the rest fit, and the
 * flexible one takes up the slack.
 */
export const allocateColumns = <Key extends string>(
    available: number,
    specs: ColumnSpec<Key>[],
) => {
    const kept = [...specs];
    const total = () => kept.reduce((sum, spec) => sum + spec.span, 0);

    while (total() > available && kept.length > 1) {
        const droppable = kept.filter(spec => !spec.flexible);
        const lowest = droppable.reduce((low, spec) => (spec.priority < low.priority ? spec : low));
        kept.splice(kept.indexOf(lowest), 1);
    }

    const slack = Math.max(0, available - total());
    let start = 1;

    return kept.map(spec => {
        const span = spec.span + (spec.flexible ? slack : 0);
        const within: Span = [start, span];
        start += span;
        return { ...spec, within };
    });
};
