import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva(
    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium [&_svg:not([class*=size-])]:size-3 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                soft: 'h-[22px] rounded-chip border px-curve [--curve-base:4.5px] [--curve-radius:var(--pds-radius-chip)] [--curve-height:22px] text-xxs',
                pill: 'h-[22px] rounded-full px-curve [--curve-base:5.25px] [--curve-radius:9999px] [--curve-height:22px] text-xxs',
                dot: 'h-[25px] gap-2 rounded-item border border-neutral-200 bg-neutral-50 px-curve [--curve-base:5.5px] [--curve-radius:var(--pds-radius-item)] [--curve-height:25px] text-neutral-950 text-xs',
                count: 'h-[21px] min-w-8 justify-center rounded-chip px-curve [--curve-base:4.5px] [--curve-radius:var(--pds-radius-chip)] [--curve-height:21px] text-xxs',
            },
            tone: {
                neutral: '',
                success: '',
                warning: '',
                error: '',
                primary: '',
            },
        },
        compoundVariants: [
            {
                variant: 'soft',
                tone: 'neutral',
                className: 'border-neutral-200 bg-neutral-100 text-neutral-600',
            },
            {
                variant: 'soft',
                tone: 'success',
                className: 'border-success-200 bg-success-100 text-success-700',
            },
            {
                variant: 'soft',
                tone: 'warning',
                className: 'border-warning-200 bg-warning-100 text-warning-700',
            },
            {
                variant: 'soft',
                tone: 'error',
                className: 'border-error-200 bg-error-100 text-error-700',
            },
            {
                variant: 'soft',
                tone: 'primary',
                className: 'border-primary-200 bg-primary-100 text-primary-700',
            },
            { variant: 'pill', tone: 'neutral', className: 'bg-neutral-500/20 text-neutral-700' },
            { variant: 'pill', tone: 'success', className: 'bg-success-500/20 text-success-700' },
            { variant: 'pill', tone: 'warning', className: 'bg-warning-500/20 text-warning-700' },
            { variant: 'pill', tone: 'error', className: 'bg-error-500/20 text-error-600' },
            { variant: 'pill', tone: 'primary', className: 'bg-primary-500/20 text-primary-700' },
            { variant: 'count', tone: 'neutral', className: 'bg-neutral-100 text-neutral-600' },
            { variant: 'count', tone: 'success', className: 'bg-success-100 text-success-600' },
            { variant: 'count', tone: 'warning', className: 'bg-warning-100 text-warning-600' },
            { variant: 'count', tone: 'error', className: 'bg-error-100 text-error-600' },
            { variant: 'count', tone: 'primary', className: 'bg-primary-100 text-primary-600' },
        ],
        defaultVariants: {
            variant: 'soft',
            tone: 'neutral',
        },
    },
);

const dotTones = {
    neutral: 'bg-neutral-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    primary: 'bg-primary-500',
} as const;

export type BadgeProps = ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & {
        /** Leading 12px icon; the dot variant draws its own marker instead. */
        icon?: ReactNode;
    };

/**
 * Status and count labels. `soft` is the invoice and library status badge,
 * `pill` the analytics delta, `dot` the report editor's status badge and `count` the
 * sidebar menu item's count label.
 */
export const Badge = ({ variant, tone, icon, className, children, ...props }: BadgeProps) => (
    <span
        className={cn(badgeVariants({ variant, tone }), className)}
        data-slot="badge"
        data-tone={tone ?? 'neutral'}
        data-variant={variant ?? 'soft'}
        {...props}
    >
        {variant === 'dot' ? (
            <span
                aria-hidden
                className={cn('size-2 shrink-0 rounded-full', dotTones[tone ?? 'neutral'])}
                data-slot="badge-dot"
            />
        ) : (
            icon
        )}
        {children}
    </span>
);
