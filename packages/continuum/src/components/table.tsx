'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps, createContext, type ReactNode, useContext } from 'react';
import { cn } from '../lib/cn';

type TableVariant = 'ruled' | 'rows';

const TableContext = createContext<TableVariant>('ruled');

const tableWrapperVariants = cva('relative w-full overflow-x-auto', {
    variants: {
        variant: {
            ruled: 'rounded-panel border border-neutral-200 bg-neutral-50',
            rows: '',
        },
    },
    defaultVariants: { variant: 'ruled' },
});

const tableVariants = cva('w-full text-xs', {
    variants: {
        variant: {
            // Only the last row of the last section drops its rule; the wrapper border closes it.
            ruled: 'border-collapse [&>:last-child>tr:last-child>*]:border-b-0',
            rows: 'border-separate border-spacing-y-2',
        },
    },
    defaultVariants: { variant: 'ruled' },
});

export type TableProps = ComponentProps<'table'> &
    VariantProps<typeof tableVariants> & {
        wrapperClassName?: string;
    };

/**
 * A data table in two looks. `ruled` is the library table, the email sequencing
 * phases and the invoice lines: hairline rows in a bordered panel. `rows` is the
 * analytics overview's top pages and regions: every row a separate rounded fill.
 */
export const Table = ({ variant, className, wrapperClassName, ...props }: TableProps) => {
    const value = variant ?? 'ruled';

    return (
        <TableContext.Provider value={value}>
            <div
                className={cn(tableWrapperVariants({ variant: value }), wrapperClassName)}
                data-slot="table-wrapper"
            >
                <table
                    className={cn(tableVariants({ variant: value }), className)}
                    data-slot="table"
                    data-variant={value}
                    {...props}
                />
            </div>
        </TableContext.Provider>
    );
};

export const TableHeader = ({ className, ...props }: ComponentProps<'thead'>) => (
    <thead className={className} data-slot="table-header" {...props} />
);

export const TableBody = ({ className, ...props }: ComponentProps<'tbody'>) => (
    <tbody className={className} data-slot="table-body" {...props} />
);

/** Totals row of the invoice lines: the same rule, on the header's muted fill. */
export const TableFooter = ({ className, ...props }: ComponentProps<'tfoot'>) => (
    <tfoot
        className={cn('[&_td]:bg-neutral-100 [&_th]:bg-neutral-100', className)}
        data-slot="table-footer"
        {...props}
    />
);

const tableRowVariants = cva('', {
    variants: {
        variant: {
            ruled: 'transition-colors duration-150 data-[state=selected]:bg-neutral-100 [tbody>&]:hover:bg-neutral-950/[0.03]',
            rows: '',
        },
    },
});

export const TableRow = ({ className, ...props }: ComponentProps<'tr'>) => {
    const variant = useContext(TableContext);

    return (
        <tr
            className={cn(tableRowVariants({ variant }), className)}
            data-slot="table-row"
            {...props}
        />
    );
};

type CellAlignProps = {
    align?: 'left' | 'right';
    /** Tabular figures, right aligned. */
    numeric?: boolean;
};

const alignClass = ({ align, numeric }: CellAlignProps) =>
    cn(
        numeric && 'tabular-nums',
        (align ?? (numeric ? 'right' : 'left')) === 'right' ? 'text-right' : 'text-left',
    );

const tableHeadVariants = cva('whitespace-nowrap font-normal text-xs', {
    variants: {
        variant: {
            ruled: 'h-[41px] border-neutral-200 border-b bg-neutral-100 p-3 text-neutral-600',
            rows: 'px-3 py-0.5 text-neutral-700',
        },
    },
});

export type TableHeadProps = Omit<ComponentProps<'th'>, 'align'> & CellAlignProps;

export const TableHead = ({ align, numeric, className, ...props }: TableHeadProps) => {
    const variant = useContext(TableContext);

    return (
        <th
            className={cn(
                tableHeadVariants({ variant }),
                alignClass({ align, numeric }),
                className,
            )}
            data-slot="table-head"
            scope="col"
            {...props}
        />
    );
};

const tableCellVariants = cva('text-xs', {
    variants: {
        variant: {
            ruled: 'h-[41px] border-neutral-200 border-b p-3 font-medium text-neutral-900',
            rows: 'h-[33px] bg-neutral-100 px-3 py-2 font-normal text-neutral-600 first:rounded-l-panel last:rounded-r-panel first:text-neutral-800',
        },
    },
});

export type TableCellProps = Omit<ComponentProps<'td'>, 'align'> & CellAlignProps;

export const TableCell = ({ align, numeric, className, ...props }: TableCellProps) => {
    const variant = useContext(TableContext);

    return (
        <td
            className={cn(
                tableCellVariants({ variant }),
                alignClass({ align, numeric }),
                className,
            )}
            data-slot="table-cell"
            {...props}
        />
    );
};

export type TableGroupRowProps = ComponentProps<'tr'> & {
    /** Columns the header spans; more than the table has is harmless. */
    colSpan?: number;
    /** Muted note after the title, wrapped in parentheses. */
    hint?: ReactNode;
};

/** Phase header from the email sequencing table: a muted full-width row above its steps. */
export const TableGroupRow = ({
    colSpan = 100,
    hint,
    className,
    children,
    ...props
}: TableGroupRowProps) => (
    <tr className={className} data-slot="table-group-row" {...props}>
        <td
            className="h-[33px] border-neutral-200 border-b bg-neutral-100 px-3 py-2 text-left font-normal text-neutral-700 text-xs"
            colSpan={colSpan}
        >
            {children}
            {hint != null && <span className="ml-1 text-neutral-500 text-xxs">({hint})</span>}
        </td>
    </tr>
);

export const TableCaption = ({ className, ...props }: ComponentProps<'caption'>) => (
    <caption
        className={cn('caption-bottom px-3 py-2 text-left text-neutral-600 text-xs', className)}
        data-slot="table-caption"
        {...props}
    />
);
