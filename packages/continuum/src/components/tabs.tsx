'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';

/** The pill tabs from the report editor's detail view. */
export const Tabs = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) => (
    <TabsPrimitive.Root
        className={cn('flex flex-col gap-4', className)}
        data-slot="tabs"
        {...props}
    />
);

export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
    <TabsPrimitive.List
        className={cn('flex items-center gap-2', className)}
        data-slot="tabs-list"
        {...props}
    />
);

export const TabsTrigger = ({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) => (
    <TabsPrimitive.Trigger
        className={cn(
            // Drawn at 8px: the item radius less 2px, the same shape as a segment.
            'inline-flex h-[29px] cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[calc(var(--pds-radius-item)-2px)] px-curve font-medium text-neutral-900 text-xs transition-[background-color,color] duration-150 [--curve-base:6px] [--curve-height:29px] [--curve-radius:calc(var(--pds-radius-item)_-_2px)]',
            'hover:bg-neutral-950/5 hover:text-neutral-950 data-[state=active]:bg-tint data-[state=active]:text-tint-fg',
            'disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
            focusRing,
            className,
        )}
        data-slot="tabs-trigger"
        {...props}
    />
);

export const TabsContent = ({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Content>) => (
    <TabsPrimitive.Content
        className={cn(focusRing, className)}
        data-slot="tabs-content"
        {...props}
    />
);
