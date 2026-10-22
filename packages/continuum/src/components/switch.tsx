'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';
import { useFieldControl } from './field';

/**
 * The library toggle (48x25 track, 21px knob). The knob takes the on-action
 * colour when checked so it stays visible on a light action track in dark mode.
 */
export const Switch = ({
    className,
    id,
    disabled,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
    ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) => {
    const { invalid: _invalid, ...control } = useFieldControl({
        id,
        disabled,
        'aria-describedby': describedBy,
        'aria-invalid': ariaInvalid,
    });

    return (
        <SwitchPrimitive.Root
            className={cn(
                'inline-flex h-[25px] w-12 shrink-0 cursor-pointer items-center rounded-full bg-neutral-300 p-0.5 transition-[background-color] duration-150',
                'data-[state=checked]:bg-action data-[state=checked]:shadow-action data-[state=checked]:[background-image:var(--pds-action-gradient)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                focusRing,
                className,
            )}
            data-slot="switch"
            {...control}
            {...props}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'pointer-events-none block size-[21px] rounded-full bg-neutral-50 transition-[translate,background-color] duration-200 ease-out-strong motion-reduce:transition-none',
                    'data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-on-action',
                )}
                data-slot="switch-thumb"
            />
        </SwitchPrimitive.Root>
    );
};
