import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Keyboard shortcut key from the sidebar menu item and the report editor's sidebar. */
export const Kbd = ({ className, ...props }: ComponentProps<'kbd'>) => (
    <kbd
        className={cn(
            'inline-flex h-[21px] min-w-[21px] shrink-0 items-center justify-center rounded-chip border border-neutral-300 px-1 font-medium font-sans text-neutral-700 text-xxs',
            className,
        )}
        data-slot="kbd"
        {...props}
    />
);
