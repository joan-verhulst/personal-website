import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';

export type FilterChipProps = ComponentProps<'span'> & {
    /** Leading 12px icon. */
    icon?: ReactNode;
    onRemove?: () => void;
    /** Accessible name of the remove button; defaults to "Remove <label>" for text labels. */
    removeLabel?: string;
};

/**
 * Removable filter tag from the analytics top bar. Without `onRemove` it renders
 * as a static tag.
 */
export const FilterChip = ({
    icon,
    onRemove,
    removeLabel,
    className,
    children,
    ...props
}: FilterChipProps) => (
    <span
        className={cn(
            'inline-flex h-[25px] shrink-0 items-center gap-3 whitespace-nowrap rounded-full bg-neutral-100 px-curve font-normal text-neutral-600 text-xs [--curve-base:4.875px] [--curve-height:25px] [--curve-radius:9999px] [&_svg:not([class*=size-])]:size-3 [&_svg]:shrink-0',
            className,
        )}
        data-slot="filter-chip"
        {...props}
    >
        <span className="inline-flex items-center gap-1.5">
            {icon}
            {children}
        </span>
        {onRemove && (
            <button
                aria-label={
                    removeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove')
                }
                className={cn(
                    '-m-1 inline-flex cursor-pointer items-center justify-center rounded-full p-1 transition-colors duration-150 hover:text-neutral-950',
                    focusRing,
                )}
                data-slot="filter-chip-remove"
                onClick={onRemove}
                type="button"
            >
                <X aria-hidden strokeWidth={1.5} />
            </button>
        )}
    </span>
);

export type SuggestionChipProps = ComponentProps<'button'> & {
    /** Leading 16px icon. */
    icon?: ReactNode;
};

/** Prompt suggestion from the report generator, set in a row after a "Suggestions:" label. */
export const SuggestionChip = ({
    icon,
    className,
    children,
    type = 'button',
    ...props
}: SuggestionChipProps) => (
    <button
        className={cn(
            'inline-flex h-[29px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control border border-neutral-200 px-curve font-normal text-neutral-950 text-xs transition-colors duration-150 [--curve-base:5px] [--curve-height:29px] [--curve-radius:var(--pds-radius-control)] hover:border-neutral-300',
            'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
            focusRing,
            className,
        )}
        data-slot="suggestion-chip"
        type={type}
        {...props}
    >
        {icon}
        {children}
    </button>
);
