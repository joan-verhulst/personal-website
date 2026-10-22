'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { ToggleGroup } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { useSingleValue } from '../lib/use-single-value';
import { focusRing } from './button';
import type { SegmentedControlProps } from './segmented-control';

/**
 * The bar that floats at the bottom of a page: a dock of sections and, beside
 * it, the page's main action (a + or a filter). Its corners follow the theme,
 * a full pill in Eyes and 10px in the older products, unless `shape` says
 * otherwise.
 */
export const BottomBar = ({
    floating,
    className,
    ...props
}: ComponentProps<'div'> & {
    /** Pins the bar 24px above the bottom of its positioned parent, centred. */
    floating?: boolean;
}) => (
    <div
        className={cn(
            'flex items-center gap-2',
            floating && 'absolute inset-x-0 bottom-6 z-10 mx-auto w-fit',
            className,
        )}
        data-slot="bottom-bar"
        {...props}
    />
);

const shapeVariants = {
    theme: '',
    pill: '[--pds-radius-dock:9999px]',
    rounded: '[--pds-radius-dock:10px]',
};

export const dockVariants = cva(
    'flex h-10 w-fit max-w-full items-center gap-0.5 rounded-dock border border-neutral-200 bg-neutral-50 p-[3px] shadow-float',
    { variants: { shape: shapeVariants }, defaultVariants: { shape: 'theme' } },
);

export type DockProps = SegmentedControlProps & VariantProps<typeof dockVariants>;

/** The sections of a page. Like a segmented control it always keeps one selected. */
export const Dock = ({
    shape,
    value,
    defaultValue,
    onValueChange,
    className,
    ...props
}: DockProps) => {
    const [current, select] = useSingleValue(value, defaultValue, onValueChange);

    return (
        <ToggleGroup.Root
            className={cn(dockVariants({ shape }), className)}
            data-slot="dock"
            onValueChange={select}
            type="single"
            value={current}
            {...props}
        />
    );
};

export const DockItem = ({ className, ...props }: ComponentProps<typeof ToggleGroup.Item>) => (
    <ToggleGroup.Item
        className={cn(
            // The bar's radius minus its 3px inset, so the curves stay concentric.
            'inline-flex h-8 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-[calc(var(--pds-radius-dock)-3px)] px-3 font-medium text-neutral-600 text-xs transition-[background-color,color,box-shadow] duration-150',
            // The outer sides ease from 12px at a pill to 8px at square corners, as the curve stops eating into them.
            'first:pl-[min(12px,calc(8px+var(--pds-radius-dock)/5))] last:pr-[min(12px,calc(8px+var(--pds-radius-dock)/5))]',
            'hover:text-neutral-950',
            'data-[state=on]:bg-segment data-[state=on]:text-segment-fg data-[state=on]:[box-shadow:inset_0_0_0_1px_var(--pds-segment-border),var(--pds-segment-shadow)]',
            'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
            focusRing,
            className,
        )}
        data-slot="dock-item"
        {...props}
    />
);

export const dockActionVariants = cva(
    [
        'inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-dock bg-action font-medium text-on-action text-xs shadow-action transition-colors duration-150 [background-image:var(--pds-action-gradient)]',
        'hover:bg-action-hover hover:[background-image:none]',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
        focusRing,
    ],
    {
        variants: {
            shape: shapeVariants,
            size: {
                default:
                    'px-curve [--curve-base:11px] [--curve-radius:var(--pds-radius-dock)] [--curve-height:40px]',
                icon: 'w-10',
            },
        },
        defaultVariants: { shape: 'theme', size: 'default' },
    },
);

export type DockActionProps = ComponentProps<'button'> & VariantProps<typeof dockActionVariants>;

/**
 * The action beside the dock: "Start campaign" with a rocket, a filter with
 * its count "(6)", or `size="icon"` for a lone +.
 */
export const DockAction = ({
    shape,
    size,
    className,
    type = 'button',
    ...props
}: DockActionProps) => (
    <button
        className={cn(dockActionVariants({ shape, size }), className)}
        data-slot="dock-action"
        type={type}
        {...props}
    />
);
