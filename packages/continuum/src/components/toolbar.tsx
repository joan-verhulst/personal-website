'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Sparkles } from 'lucide-react';
import { Toolbar as ToolbarPrimitive } from 'radix-ui';
import { type ComponentProps, createContext, type ReactNode, useContext } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';

const toolbarVariants = cva(
    'flex w-fit max-w-full items-stretch border border-neutral-200 bg-neutral-50 shadow-float',
    {
        variants: {
            variant: {
                inline: 'h-[33px] overflow-hidden rounded-control',
                floating: 'gap-0.5 rounded-item p-1',
            },
        },
        defaultVariants: { variant: 'inline' },
    },
);

const toolbarButtonVariants = cva(
    [
        'inline-flex cursor-pointer select-none items-center whitespace-nowrap font-medium text-neutral-600 text-xs transition-[background-color,color] duration-150',
        'hover:bg-neutral-950/5 hover:text-neutral-950',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
        focusRing,
    ],
    {
        variants: {
            variant: {
                // The bar clips overflow, so the ring has to sit inside the button.
                inline: 'gap-1.5 border-neutral-200 not-last:border-r px-3 focus-visible:-outline-offset-2',
                floating:
                    'h-[33px] gap-2 rounded-[calc(var(--pds-radius-item)-2px)] px-curve [--curve-base:10px] [--curve-radius:calc(var(--pds-radius-item)_-_2px)] [--curve-height:33px]',
            },
        },
        defaultVariants: { variant: 'inline' },
    },
);

type ToolbarVariant = NonNullable<VariantProps<typeof toolbarVariants>['variant']>;

const ToolbarVariantContext = createContext<ToolbarVariant>('inline');

export type ToolbarProps = ComponentProps<typeof ToolbarPrimitive.Root> &
    VariantProps<typeof toolbarVariants>;

/**
 * `inline` is the report editor's AI toolbar over a table cell: flush segments
 * split by hairlines. `floating` is the sequence editor's bottom action bar:
 * padded, with rounded items and no dividers.
 */
export const Toolbar = ({ variant, className, ...props }: ToolbarProps) => (
    <ToolbarVariantContext.Provider value={variant ?? 'inline'}>
        <ToolbarPrimitive.Root
            className={cn(toolbarVariants({ variant }), className)}
            data-slot="toolbar"
            data-variant={variant ?? 'inline'}
            {...props}
        />
    </ToolbarVariantContext.Provider>
);

export const ToolbarButton = ({
    className,
    ...props
}: ComponentProps<typeof ToolbarPrimitive.Button>) => {
    const variant = useContext(ToolbarVariantContext);

    return (
        <ToolbarPrimitive.Button
            className={cn(toolbarButtonVariants({ variant }), className)}
            data-slot="toolbar-button"
            type="button"
            {...props}
        />
    );
};

type ToolbarChipProps = ComponentProps<'span'> & {
    /** Replaces the default sparkles icon. */
    icon?: ReactNode;
};

/** The tinted lead chip ("AI suggestions") at the start of the inline toolbar. */
export const ToolbarChip = ({ icon, className, children, ...props }: ToolbarChipProps) => (
    <span
        className={cn(
            // Inset 2px inside a 1px border, so the bar's radius minus 3px keeps it concentric.
            'm-0.5 inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--pds-radius-control)-3px)] bg-tint px-curve font-medium text-tint-fg text-xxs [--curve-base:5.75px] [--curve-height:29px] [--curve-radius:calc(var(--pds-radius-control)_-_3px)] [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
            className,
        )}
        data-slot="toolbar-chip"
        {...props}
    >
        {icon ?? <Sparkles strokeWidth={1.5} />}
        {children}
    </span>
);
