import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronRight, House } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';

/** Header-bar trail from the app shell and the analytics top bars. */
export const Breadcrumb = ({
    'aria-label': ariaLabel = 'Breadcrumb',
    ...props
}: ComponentProps<'nav'>) => <nav aria-label={ariaLabel} data-slot="breadcrumb" {...props} />;

export const breadcrumbListVariants = cva('flex flex-wrap items-center gap-2 text-neutral-600', {
    variants: {
        size: {
            md: 'font-normal text-xs',
            // The 2024 and 2025 product headers set the trail a size up, in medium.
            lg: 'font-medium text-sm',
        },
    },
    defaultVariants: {
        size: 'md',
    },
});

export type BreadcrumbListProps = ComponentProps<'ol'> &
    VariantProps<typeof breadcrumbListVariants>;

export const BreadcrumbList = ({ size, className, ...props }: BreadcrumbListProps) => (
    <ol
        className={cn(breadcrumbListVariants({ size }), className)}
        data-slot="breadcrumb-list"
        {...props}
    />
);

export const BreadcrumbItem = ({ className, ...props }: ComponentProps<'li'>) => (
    <li
        className={cn('inline-flex items-center gap-2', className)}
        data-slot="breadcrumb-item"
        {...props}
    />
);

export type BreadcrumbLinkProps = ComponentProps<'a'> & {
    asChild?: boolean;
};

export const BreadcrumbLink = ({ asChild, className, ...props }: BreadcrumbLinkProps) => {
    const Component = asChild ? Slot.Root : 'a';

    return (
        <Component
            className={cn(
                'rounded-xs text-neutral-600 transition-colors duration-150 hover:text-neutral-950',
                focusRing,
                className,
            )}
            data-slot="breadcrumb-link"
            {...props}
        />
    );
};

export const BreadcrumbPage = ({ className, ...props }: ComponentProps<'span'>) => (
    <span
        aria-current="page"
        className={cn('text-neutral-950', className)}
        data-slot="breadcrumb-page"
        {...props}
    />
);

export const BreadcrumbSeparator = ({ className, children, ...props }: ComponentProps<'li'>) => (
    <li
        aria-hidden
        className={cn('inline-flex text-neutral-400 [&_svg]:size-4', className)}
        data-slot="breadcrumb-separator"
        role="presentation"
        {...props}
    >
        {children ?? <ChevronRight strokeWidth={1.5} />}
    </li>
);

/** House icon that stands in for the root crumb; wrap it in a BreadcrumbLink to make it a link. */
export const BreadcrumbHome = ({
    'aria-label': ariaLabel = 'Home',
    className,
    ...props
}: ComponentProps<typeof House>) => (
    <House
        aria-label={ariaLabel}
        className={cn('size-4 shrink-0 text-neutral-400', className)}
        data-slot="breadcrumb-home"
        role="img"
        strokeWidth={1.5}
        {...props}
    />
);
