import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const focusRing =
    'outline-none focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2';

export const buttonVariants = cva(
    [
        'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium text-xs transition-[background-color,border-color,color,opacity] duration-150',
        'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
        focusRing,
    ],
    {
        variants: {
            variant: {
                primary: [
                    'bg-action text-on-action shadow-action [background-image:var(--pds-action-gradient)]',
                    'hover:bg-action-hover hover:[background-image:none]',
                ],
                secondary:
                    'border border-neutral-200 text-neutral-950 shadow-float hover:border-neutral-300 hover:text-neutral-700',
                ghost: 'text-neutral-600 hover:bg-neutral-950/5 hover:text-neutral-800',
            },
            size: {
                md: 'h-[33px] rounded-control px-curve [--curve-base:9px] [--curve-radius:var(--pds-radius-control)] [--curve-height:33px]',
                lg: 'h-[41px] rounded-control-lg px-curve [--curve-base:12.5px] [--curve-radius:var(--pds-radius-control-lg)] [--curve-height:41px]',
                icon: 'size-[33px] rounded-control',
                'icon-sm': 'size-7 rounded-chip',
            },
            shape: {
                default: '',
                pill: 'rounded-full [--curve-radius:9999px]',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
            shape: 'default',
        },
    },
);

export type ButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    };

/**
 * One label size (13px medium) at every height; size only changes padding and
 * radius, the way the button library is drawn. Icons sit at 16px either side.
 */
export const Button = ({
    variant,
    size,
    shape,
    asChild,
    className,
    type = 'button',
    ...props
}: ButtonProps) => {
    const Component = asChild ? Slot.Root : 'button';

    return (
        <Component
            className={cn(buttonVariants({ variant, size, shape }), className)}
            data-slot="button"
            type={asChild ? undefined : type}
            {...props}
        />
    );
};
