'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronRight } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { ThemeScope } from './theme';

const contentClass = [
    'z-50 flex max-h-(--radix-dropdown-menu-content-available-height) min-w-40 flex-col gap-1 overflow-y-auto rounded-item border border-neutral-200 bg-neutral-50 p-1 shadow-float',
    'origin-(--radix-dropdown-menu-content-transform-origin) transition-[opacity,scale] duration-200 ease-out-strong starting:scale-95 starting:opacity-0 motion-reduce:transition-none',
];

const itemVariants = cva(
    [
        'relative flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-item px-curve [--curve-base:5.5px] [--curve-radius:var(--pds-radius-item)] [--curve-height:32px] font-medium text-xs outline-none',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
    ],
    {
        variants: {
            variant: {
                default: [
                    'text-neutral-700 [&_svg]:text-neutral-600',
                    'data-highlighted:bg-neutral-950/5 data-highlighted:text-neutral-800',
                ],
                danger: 'text-error-600 data-highlighted:bg-neutral-950/5 [&_svg]:text-current',
            },
        },
        defaultVariants: { variant: 'default' },
    },
);

/** Row-action and account menus (report editor ellipsis, invoice table rows). */
export const DropdownMenu = (props: ComponentProps<typeof DropdownMenuPrimitive.Root>) => (
    <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
);

export const DropdownMenuTrigger = (
    props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) => <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;

export const DropdownMenuGroup = (props: ComponentProps<typeof DropdownMenuPrimitive.Group>) => (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
);

export const DropdownMenuSub = (props: ComponentProps<typeof DropdownMenuPrimitive.Sub>) => (
    <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
);

export const DropdownMenuRadioGroup = (
    props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) => <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;

export const DropdownMenuContent = ({
    className,
    sideOffset = 4,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
    <DropdownMenuPrimitive.Portal>
        <ThemeScope>
            <DropdownMenuPrimitive.Content
                className={cn(contentClass, className)}
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                {...props}
            />
        </ThemeScope>
    </DropdownMenuPrimitive.Portal>
);

export const DropdownMenuSubContent = ({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) => (
    <DropdownMenuPrimitive.Portal>
        <ThemeScope>
            <DropdownMenuPrimitive.SubContent
                className={cn(contentClass, className)}
                data-slot="dropdown-menu-sub-content"
                {...props}
            />
        </ThemeScope>
    </DropdownMenuPrimitive.Portal>
);

export type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> &
    VariantProps<typeof itemVariants>;

export const DropdownMenuItem = ({ variant, className, ...props }: DropdownMenuItemProps) => (
    <DropdownMenuPrimitive.Item
        className={cn(itemVariants({ variant }), className)}
        data-slot="dropdown-menu-item"
        data-variant={variant ?? 'default'}
        {...props}
    />
);

export const DropdownMenuCheckboxItem = ({
    className,
    children,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) => (
    <DropdownMenuPrimitive.CheckboxItem
        className={cn(itemVariants(), 'pr-1.5', className)}
        data-slot="dropdown-menu-checkbox-item"
        {...props}
    >
        {children}
        <DropdownMenuPrimitive.ItemIndicator className="ml-auto flex">
            <Check strokeWidth={1.5} />
        </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
);

export const DropdownMenuRadioItem = ({
    className,
    children,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) => (
    <DropdownMenuPrimitive.RadioItem
        className={cn(
            itemVariants(),
            'pr-1.5 data-[state=checked]:bg-neutral-100 data-[state=checked]:text-neutral-950',
            className,
        )}
        data-slot="dropdown-menu-radio-item"
        {...props}
    >
        {children}
        <DropdownMenuPrimitive.ItemIndicator className="ml-auto flex">
            <Check strokeWidth={1.5} />
        </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
);

export const DropdownMenuSubTrigger = ({
    className,
    children,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) => (
    <DropdownMenuPrimitive.SubTrigger
        className={cn(
            itemVariants(),
            'pr-1.5 data-[state=open]:bg-neutral-950/5 data-[state=open]:text-neutral-800',
            className,
        )}
        data-slot="dropdown-menu-sub-trigger"
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto" strokeWidth={1.5} />
    </DropdownMenuPrimitive.SubTrigger>
);

export const DropdownMenuLabel = ({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) => (
    <DropdownMenuPrimitive.Label
        className={cn('px-2 pt-1.5 pb-1 font-medium text-neutral-600 text-xxs', className)}
        data-slot="dropdown-menu-label"
        {...props}
    />
);

export const DropdownMenuSeparator = ({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
    <DropdownMenuPrimitive.Separator
        className={cn('-mx-1 h-px bg-neutral-200', className)}
        data-slot="dropdown-menu-separator"
        {...props}
    />
);

export const DropdownMenuShortcut = ({ className, ...props }: ComponentProps<'span'>) => (
    <span
        className={cn('ml-auto pl-3 font-medium text-neutral-500 text-xxs', className)}
        data-slot="dropdown-menu-shortcut"
        {...props}
    />
);
