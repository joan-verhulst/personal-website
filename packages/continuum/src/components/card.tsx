import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge } from './badge';

export const cardVariants = cva(
    'flex flex-col rounded-card border border-neutral-200 bg-neutral-50',
    {
        variants: {
            layout: {
                default: 'gap-4 p-4',
                list: 'gap-4 p-5',
                // The deep bottom pad leaves room under a chart's x labels.
                chart: 'gap-8 p-5 pb-12',
            },
        },
        defaultVariants: {
            layout: 'default',
        },
    },
);

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>;

/**
 * Bordered surface from the analytics screens. Cards share the page colour and
 * are told apart by the hairline alone, so there is no shadow. `list` is the
 * top pages and donut cards, `chart` the area chart cards.
 */
export const Card = ({ layout, className, ...props }: CardProps) => (
    <div className={cn(cardVariants({ layout }), className)} data-slot="card" {...props} />
);

export const CardHeader = ({ className, ...props }: ComponentProps<'div'>) => (
    <div className={cn('flex flex-col gap-0.5', className)} data-slot="card-header" {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<'p'>) => (
    <p
        className={cn('font-normal text-neutral-600 text-xs', className)}
        data-slot="card-title"
        {...props}
    />
);

export const cardValueVariants = cva('font-medium text-neutral-950 tabular-nums', {
    variants: {
        size: {
            md: 'text-lg',
            lg: 'text-2xl',
            xl: 'text-3xl',
        },
    },
    defaultVariants: {
        size: 'md',
    },
});

export type CardValueProps = ComponentProps<'p'> & VariantProps<typeof cardValueVariants>;

/** Headline number: 18px in KPI cards, 24 or 31 in chart card headers. */
export const CardValue = ({ size, className, ...props }: CardValueProps) => (
    <p className={cn(cardValueVariants({ size }), className)} data-slot="card-value" {...props} />
);

/** Value and delta on one baseline, as in the chart card headers. */
export const CardFigure = ({ className, ...props }: ComponentProps<'div'>) => (
    <div
        className={cn('flex flex-wrap items-baseline gap-x-2', className)}
        data-slot="card-figure"
        {...props}
    />
);

export type CardDeltaProps = ComponentProps<'span'> & {
    trend?: 'up' | 'down';
};

/** Inline change figure set beside a chart card's value. */
export const CardDelta = ({ trend = 'up', className, ...props }: CardDeltaProps) => (
    <span
        className={cn(
            'font-normal text-xs',
            trend === 'up' ? 'text-success-600' : 'text-error-500',
            className,
        )}
        data-slot="card-delta"
        data-trend={trend}
        {...props}
    />
);

export type StatCardProps = Omit<ComponentProps<'div'>, 'children'> & {
    label: ReactNode;
    value: ReactNode;
    delta?: ReactNode;
    /** Colours the delta pill; `neutral` for changes that are neither good nor bad. */
    trend?: 'up' | 'down' | 'neutral';
};

/** KPI card from the checkout-funnel screen: label, value, then a delta pill. */
export const StatCard = ({
    label,
    value,
    delta,
    trend = 'up',
    className,
    ...props
}: StatCardProps) => (
    <Card className={cn('gap-3', className)} data-slot="stat-card" {...props}>
        <div className="flex flex-col gap-1">
            <CardTitle>{label}</CardTitle>
            <CardValue>{value}</CardValue>
        </div>
        {delta !== undefined && (
            <Badge
                className="self-start"
                tone={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'neutral'}
                variant="pill"
            >
                {delta}
            </Badge>
        )}
    </Card>
);

export type MetaRowProps = Omit<ComponentProps<'div'>, 'children'> & {
    label: ReactNode;
    value: ReactNode;
};

/** Label/value strip above the invoice table. */
export const MetaRow = ({ label, value, className, ...props }: MetaRowProps) => (
    <div
        className={cn(
            'flex items-center justify-between gap-4 rounded-panel border border-neutral-200 p-4 font-normal text-xs',
            className,
        )}
        data-slot="meta-row"
        {...props}
    >
        <span className="text-neutral-500">{label}</span>
        <span className="text-neutral-900">{value}</span>
    </div>
);
