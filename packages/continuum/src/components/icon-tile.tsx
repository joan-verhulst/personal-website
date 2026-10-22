import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const iconTileVariants = cva(
    'inline-flex size-8 shrink-0 items-center justify-center rounded-chip border border-neutral-200 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                filled: 'bg-neutral-100',
                outline: '',
            },
            tone: {
                neutral: 'text-neutral-600',
                success: 'text-success-500',
                warning: 'text-warning-500',
                error: 'text-error-500',
                primary: 'text-primary-500',
            },
        },
        defaultVariants: {
            variant: 'filled',
            tone: 'neutral',
        },
    },
);

export type IconTileProps = ComponentProps<'span'> & VariantProps<typeof iconTileVariants>;

/**
 * Square icon well: filled beside the report generator's option rows, outlined
 * in the invoice sheet's status history.
 */
export const IconTile = ({ variant, tone, className, ...props }: IconTileProps) => (
    <span
        className={cn(iconTileVariants({ variant, tone }), className)}
        data-slot="icon-tile"
        data-tone={tone ?? 'neutral'}
        {...props}
    />
);
