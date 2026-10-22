'use client';

import { ToggleGroup } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { useSingleValue } from '../lib/use-single-value';
import { focusRing } from './button';

export type SegmentedControlProps = Omit<
    ComponentProps<typeof ToggleGroup.Root>,
    'type' | 'value' | 'defaultValue' | 'onValueChange'
> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    /** Shares the full width out evenly between the items, instead of hugging them. */
    fill?: boolean;
};

/**
 * The library's "tab group" (report editor filters, analytics range picker).
 * Always holds one value: clicking the active segment keeps it selected.
 */
export const SegmentedControl = ({
    fill,
    value,
    defaultValue,
    onValueChange,
    className,
    ...props
}: SegmentedControlProps) => {
    const [current, select] = useSingleValue(value, defaultValue, onValueChange);

    return (
        <ToggleGroup.Root
            className={cn(
                // Hugs its items even in a stretching flex column, and never outgrows its parent.
                'flex h-[34px] max-w-full items-center rounded-item border border-neutral-200 bg-segment-track p-0.5',
                fill ? 'w-full [&>*]:flex-1' : 'w-fit',
                className,
            )}
            data-slot="segmented-control"
            onValueChange={select}
            type="single"
            value={current}
            {...props}
        />
    );
};

export type SegmentedControlItemProps = ComponentProps<typeof ToggleGroup.Item>;

export const SegmentedControlItem = ({ className, ...props }: SegmentedControlItemProps) => (
    <ToggleGroup.Item
        className={cn(
            // The track's radius minus its 2px inset, so the curves stay concentric in every theme.
            'inline-flex h-[29px] min-w-0 cursor-pointer select-none items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[calc(var(--pds-radius-item)-2px)] px-curve font-medium text-neutral-600 text-xs transition-[background-color,color,box-shadow] duration-150 [--curve-base:8px] [--curve-height:29px] [--curve-radius:calc(var(--pds-radius-item)_-_2px)]',
            'hover:bg-neutral-950/5 hover:text-neutral-800',
            // An inset ring, not a border, so the raised themes' outline adds no width.
            'data-[state=on]:bg-segment data-[state=on]:text-segment-fg data-[state=on]:[box-shadow:inset_0_0_0_1px_var(--pds-segment-border),var(--pds-segment-shadow)]',
            'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
            focusRing,
            className,
        )}
        data-slot="segmented-control-item"
        {...props}
    />
);
