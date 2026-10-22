'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { UserRound } from 'lucide-react';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import { Children, type ComponentProps, isValidElement } from 'react';
import { cn } from '../lib/cn';

export const avatarVariants = cva(
    'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-neutral-100 font-medium text-neutral-600',
    {
        variants: {
            shape: {
                square: 'rounded-chip border border-neutral-200',
                round: 'rounded-full',
            },
            size: {
                24: 'size-6 text-xxs [&_svg]:size-3.5',
                32: 'size-8 text-xs [&_svg]:size-4',
                36: 'size-9 text-xs [&_svg]:size-4',
            },
        },
        defaultVariants: {
            shape: 'square',
            size: 32,
        },
    },
);

export type AvatarProps = ComponentProps<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarVariants> & {
        src?: string;
        alt?: string;
        /** Initials shown while the image loads or when it fails; a person icon otherwise. */
        fallback?: string;
    };

/**
 * Workspace and user avatar from the sidebar switcher, the icon rail footer and
 * the invoice sheet. Square with a hairline by default, round for people lists.
 */
export const Avatar = ({
    shape,
    size,
    src,
    alt = '',
    fallback,
    className,
    children,
    ...props
}: AvatarProps) => (
    <AvatarPrimitive.Root
        className={cn(avatarVariants({ shape, size }), className)}
        data-slot="avatar"
        {...props}
    >
        {src && (
            <AvatarPrimitive.Image
                alt={alt}
                className="size-full object-cover"
                data-slot="avatar-image"
                src={src}
            />
        )}
        <AvatarPrimitive.Fallback
            aria-label={alt || undefined}
            role={alt ? 'img' : undefined}
            className="flex size-full items-center justify-center"
            data-slot="avatar-fallback"
        >
            {fallback ?? <UserRound aria-hidden strokeWidth={1.5} />}
        </AvatarPrimitive.Fallback>
        {children}
    </AvatarPrimitive.Root>
);

export type AvatarStackProps = ComponentProps<'div'> & {
    /** Avatars past this count collapse into a "+N" tile. */
    max?: number;
};

/** Overlapping row of 24px avatars, each ringed in the surface colour so they read apart. */
export const AvatarStack = ({ max, className, children, ...props }: AvatarStackProps) => {
    const items = Children.toArray(children).filter(isValidElement);
    const shown = max === undefined ? items : items.slice(0, max);
    const hidden = items.length - shown.length;

    return (
        <div
            className={cn('flex items-center -space-x-3 *:ring-2 *:ring-neutral-50', className)}
            data-slot="avatar-stack"
            {...props}
        >
            {shown}
            {hidden > 0 && (
                <span
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-medium text-neutral-600 text-xxs"
                    data-slot="avatar-stack-overflow"
                >
                    +{hidden}
                </span>
            )}
        </div>
    );
};
