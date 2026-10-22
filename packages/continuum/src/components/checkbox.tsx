'use client';

import { Check, Minus } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { focusRing } from './button';
import { useFieldControl } from './field';

/**
 * The library checkbox (22px, chip radius), used in table header/body cells and
 * the report-generator option rows. Checked fills with the action colour but
 * keeps its hairline, as drawn; it has no lit ring like the primary button.
 */
export const Checkbox = ({
    className,
    id,
    disabled,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
    ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) => {
    const { invalid, ...control } = useFieldControl({
        id,
        disabled,
        'aria-describedby': describedBy,
        'aria-invalid': ariaInvalid,
    });

    return (
        <CheckboxPrimitive.Root
            className={cn(
                'group/checkbox inline-flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-chip border bg-transparent text-on-action transition-[background-color,border-color] duration-150',
                invalid ? 'border-error-500' : 'border-neutral-200 hover:border-neutral-500',
                'data-[state=checked]:bg-action data-[state=indeterminate]:bg-action',
                'data-[state=checked]:[background-image:var(--pds-action-gradient)] data-[state=indeterminate]:[background-image:var(--pds-action-gradient)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                focusRing,
                className,
            )}
            data-slot="checkbox"
            {...control}
            {...props}
        >
            <CheckboxPrimitive.Indicator className="flex items-center justify-center">
                <Check
                    className="hidden size-4 group-data-[state=checked]/checkbox:block"
                    strokeWidth={1.5}
                />
                <Minus
                    className="hidden size-4 group-data-[state=indeterminate]/checkbox:block"
                    strokeWidth={1.5}
                />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
};
