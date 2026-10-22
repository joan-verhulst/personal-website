'use client';

import { ChevronDown, PanelLeft } from 'lucide-react';
import { Collapsible, Slot } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';

/**
 * The canvas-and-panel shell: the sidebar sits straight on the canvas, the
 * page on an inset panel with an 8px gutter.
 */
export const AppShell = ({ className, ...props }: ComponentProps<'div'>) => (
    <div
        className={cn('flex min-h-screen bg-neutral-100', className)}
        data-slot="app-shell"
        {...props}
    />
);

export const AppPanel = ({ className, ...props }: ComponentProps<'main'>) => (
    <main
        className={cn(
            'relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-neutral-200 bg-neutral-50',
            className,
        )}
        data-slot="app-panel"
        {...props}
    />
);

/** The panel's top bar: breadcrumb on the left, actions on the right. */
export const HeaderBar = ({ className, ...props }: ComponentProps<'header'>) => (
    <header
        className={cn(
            'flex h-[54px] shrink-0 items-center justify-between gap-4 border-neutral-200 border-b py-2 pr-2 pl-4',
            className,
        )}
        data-slot="header-bar"
        {...props}
    />
);

/**
 * The email sequencing sidebar: no fill of its own, so it shares the canvas,
 * with a logo row, blocks of navigation and an account footer.
 */
export const Sidebar = ({ className, ...props }: ComponentProps<'aside'>) => (
    <aside
        className={cn('flex w-64 shrink-0 flex-col overflow-hidden', className)}
        data-slot="sidebar"
        {...props}
    />
);

/** The 56px logo row: a logo on the left, the collapse toggle on the right. */
export const SidebarHeader = ({ className, ...props }: ComponentProps<'div'>) => (
    <div
        className={cn(
            'flex h-14 shrink-0 items-center justify-between pt-3 pr-4 pb-2 pl-2',
            className,
        )}
        data-slot="sidebar-header"
        {...props}
    />
);

/** A 26px mark in the action colour, centred in a 36px box. */
export const SidebarLogo = ({ className, children, ...props }: ComponentProps<'span'>) => (
    <span
        className={cn('grid size-9 shrink-0 place-items-center', className)}
        data-slot="sidebar-logo"
        {...props}
    >
        <span className="grid size-[26px] place-items-center overflow-hidden rounded-chip bg-action text-on-action [&_svg:not([class*=size-])]:size-4">
            {children}
        </span>
    </span>
);

export const SidebarToggle = ({
    className,
    type = 'button',
    'aria-label': label = 'Collapse sidebar',
    ...props
}: ComponentProps<'button'>) => (
    <button
        aria-label={label}
        className={cn(
            'grid size-[26px] cursor-pointer place-items-center rounded-xs text-neutral-300 transition-colors duration-150 hover:text-neutral-600',
            focusRing,
            className,
        )}
        data-slot="sidebar-toggle"
        type={type}
        {...props}
    >
        <PanelLeft className="size-[18px]" strokeWidth={1.5} />
    </button>
);

type SidebarGroupProps = ComponentProps<'nav'> & {
    /** Small heading above the group ("Projects"). */
    label?: ReactNode;
    /** Closes the block with a hairline, like the one under the main navigation. */
    divided?: boolean;
};

/** A block of navigation. Items sit 2px apart, inset 8px left and 12px right. */
export const SidebarGroup = ({
    label,
    divided,
    className,
    children,
    ...props
}: SidebarGroupProps) => (
    <nav
        className={cn(
            'flex shrink-0 flex-col gap-1 pt-3 pr-3 pl-2',
            divided && 'border-neutral-200 border-b pt-2 pb-3',
            className,
        )}
        data-slot="sidebar-group"
        {...props}
    >
        {label && (
            <p className="px-2 py-1 font-normal text-neutral-600 text-xs" data-slot="sidebar-label">
                {label}
            </p>
        )}
        <div className="flex flex-col gap-0.5">{children}</div>
    </nav>
);

export const navItemClasses = [
    'flex w-full cursor-pointer select-none items-center gap-2 rounded-item px-curve [--curve-base:7.5px] [--curve-radius:var(--pds-radius-item)] [--curve-height:33px] py-2 text-left font-normal transition-[background-color,color] duration-150',
    'hover:bg-neutral-950/5 aria-[current=page]:bg-neutral-950/5',
    '[&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
    focusRing,
];

type NavItemProps = ComponentProps<'button'> & {
    asChild?: boolean;
    active?: boolean;
    /** Leading 16px icon or emoji. */
    icon?: ReactNode;
    /** Right-aligned Kbd or Badge. */
    trailing?: ReactNode;
    /**
     * `primary` is the call to action at the top ("New Sequence"), set 16px
     * above the list; `project` is a 14px row in a project list ("All
     * projects"); `inset` is a page under a project, indented to line up with
     * the project's name.
     */
    variant?: 'default' | 'primary' | 'project' | 'inset';
};

/**
 * A sidebar row. The selected row gets a 5% wash rather than colour, set via
 * aria-current so router links that set it themselves work too.
 */
export const NavItem = ({
    asChild,
    active,
    icon,
    trailing,
    variant = 'default',
    className,
    children,
    type = 'button',
    ...props
}: NavItemProps) => {
    const Component = asChild ? Slot.Root : 'button';

    return (
        <Component
            aria-current={active ? 'page' : undefined}
            className={cn(
                navItemClasses,
                variant === 'default' && 'h-[33px] text-neutral-950 text-xs',
                variant === 'project' && 'h-[34px] text-neutral-950 text-sm',
                variant === 'inset' &&
                    'h-[34px] pl-8 text-neutral-700 text-sm aria-[current=page]:text-neutral-950',
                variant === 'primary' &&
                    'mb-3.5 h-[33px] bg-action text-on-action text-xs shadow-action [background-image:var(--pds-action-gradient)] hover:bg-action-hover hover:[background-image:none]',
                className,
            )}
            data-slot="nav-item"
            data-variant={variant}
            type={asChild ? undefined : type}
            {...props}
        >
            {icon}
            {asChild ? (
                <Slot.Slottable>{children}</Slot.Slottable>
            ) : (
                <span className="min-w-0 flex-1 truncate">{children}</span>
            )}
            {trailing && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
        </Component>
    );
};

type NavGroupProps = ComponentProps<typeof Collapsible.Root> & {
    /** Leading 16px icon or emoji. */
    icon?: ReactNode;
    label: ReactNode;
};

/**
 * A project that folds open to its pages. Open, it takes the selected wash and
 * shows its chevron; closed, the chevron only shows on hover.
 */
export const NavGroup = ({ icon, label, className, children, ...props }: NavGroupProps) => (
    <Collapsible.Root className={cn('flex flex-col', className)} data-slot="nav-group" {...props}>
        <Collapsible.Trigger
            className={cn(
                navItemClasses,
                'group h-[34px] text-neutral-700 text-sm data-[state=open]:bg-neutral-950/5 data-[state=open]:text-neutral-950',
            )}
            data-slot="nav-group-trigger"
        >
            {icon && (
                <span className="grid size-4 shrink-0 place-items-center text-xs">{icon}</span>
            )}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronDown
                className="opacity-0 transition-[opacity,rotate] duration-200 ease-out-strong group-hover:opacity-100 group-data-[state=closed]:-rotate-90 group-data-[state=open]:opacity-100"
                strokeWidth={1.5}
            />
        </Collapsible.Trigger>
        <Collapsible.Content className="flex flex-col gap-0.5 py-1" data-slot="nav-group-content">
            {children}
        </Collapsible.Content>
    </Collapsible.Root>
);

/** Pushed to the bottom, behind a hairline: who is signed in, and a bell. */
export const SidebarFooter = ({ className, ...props }: ComponentProps<'div'>) => (
    <div
        className={cn(
            'mt-auto flex shrink-0 items-center gap-3 border-neutral-200 border-t pt-4 pr-5 pb-6 pl-2',
            className,
        )}
        data-slot="sidebar-footer"
        {...props}
    />
);

type SidebarAccountProps = ComponentProps<'div'> & {
    /** 36px logo or avatar. */
    avatar?: ReactNode;
    name: ReactNode;
    plan?: ReactNode;
};

export const SidebarAccount = ({
    avatar,
    name,
    plan,
    className,
    ...props
}: SidebarAccountProps) => (
    <div
        className={cn('flex min-w-0 flex-1 items-center gap-3', className)}
        data-slot="sidebar-account"
        {...props}
    >
        {avatar && (
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-chip [&>img]:size-full [&>img]:object-cover">
                {avatar}
            </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-neutral-600 text-xs">{name}</span>
            {plan && <span className="truncate font-medium text-neutral-500 text-xxs">{plan}</span>}
        </span>
    </div>
);
