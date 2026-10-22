'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { useFieldControl } from './field';

/*
 * The wrapper carries the border so icons sit inside the box; the native input
 * is borderless and the wrapper shows the focus ring when it is focused.
 */
export const inputVariants = cva(
    [
        'group/input flex w-full min-w-0 items-center gap-2 border transition-[border-color] duration-150',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-focus has-[input:focus-visible]:outline-offset-2',
        '[&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
    ],
    {
        variants: {
            size: {
                sm: 'h-[34px] rounded-item px-curve [--curve-base:7.5px] [--curve-radius:var(--pds-radius-item)] [--curve-height:34px]',
                md: 'h-[38px] rounded-control px-curve [--curve-base:9px] [--curve-radius:var(--pds-radius-control)] [--curve-height:38px]',
            },
            invalid: {
                true: 'border-error-500 [&_svg]:text-error-500',
                false: '',
            },
            disabled: {
                true: 'cursor-not-allowed [&_svg]:text-neutral-300',
                false: '',
            },
        },
        compoundVariants: [
            {
                invalid: false,
                disabled: false,
                className:
                    'border-neutral-200 hover:border-neutral-300 has-[input:focus]:border-neutral-300 [&_svg]:text-neutral-600',
            },
            { invalid: false, disabled: true, className: 'border-neutral-200' },
        ],
        defaultVariants: {
            size: 'md',
            invalid: false,
            disabled: false,
        },
    },
);

/*
 * Value and placeholder colours shared with Textarea. The library's "selected"
 * state is the value in neutral-900; disabled placeholders stay a step above the
 * spec's neutral-200, which disappears on the white surfaces of the cool themes.
 */
export const inputTextClass = [
    'font-medium text-neutral-900 text-sm placeholder:text-neutral-500',
    'aria-invalid:placeholder:text-error-300',
    'disabled:cursor-not-allowed disabled:text-neutral-400 disabled:placeholder:text-neutral-300',
];

export type InputProps = Omit<ComponentProps<'input'>, 'size'> &
    Omit<VariantProps<typeof inputVariants>, 'invalid' | 'disabled'> & {
        leadingIcon?: ReactNode;
        trailing?: ReactNode;
        /** Classes for the native input; `className` goes on the bordered box. */
        inputClassName?: string;
    };

/** Inputs from the library ("input small/medium") and the report-generator forms. */
export const Input = ({
    size,
    leadingIcon,
    trailing,
    className,
    inputClassName,
    id,
    disabled,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
    ...props
}: InputProps) => {
    const { invalid, ...control } = useFieldControl({
        id,
        disabled,
        'aria-describedby': describedBy,
        'aria-invalid': ariaInvalid,
    });
    const isDisabled = Boolean(control.disabled);

    return (
        <div
            className={cn(inputVariants({ size, invalid, disabled: isDisabled }), className)}
            data-disabled={isDisabled || undefined}
            data-invalid={invalid || undefined}
            data-slot="input"
        >
            {leadingIcon}
            <input
                className={cn(
                    'h-full min-w-0 flex-1 bg-transparent outline-none',
                    inputTextClass,
                    !invalid && !isDisabled && 'group-hover/input:placeholder:text-neutral-600',
                    inputClassName,
                )}
                data-slot="input-control"
                {...control}
                {...props}
            />
            {trailing}
        </div>
    );
};
