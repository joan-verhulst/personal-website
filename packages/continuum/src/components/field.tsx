'use client';

import { Label } from 'radix-ui';
import {
    type ComponentProps,
    createContext,
    useContext,
    useEffect,
    useId,
    useMemo,
    useState,
} from 'react';
import { cn } from '../lib/cn';

type FieldContextValue = {
    id: string;
    labelId: string;
    helperId: string | undefined;
    setHelperId: (helperId: string | undefined) => void;
    invalid: boolean;
    disabled: boolean;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

export const useField = () => useContext(FieldContext);

/**
 * What a control inside a Field picks up: its id, the helper it is described by
 * and the invalid/disabled state. Props passed to the control win.
 */
export const useFieldControl = ({
    id,
    disabled,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
}: {
    id?: string;
    disabled?: boolean;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}) => {
    const field = useField();
    const invalid =
        ariaInvalid === undefined
            ? (field?.invalid ?? false)
            : ariaInvalid !== false && ariaInvalid !== 'false';

    return {
        id: id ?? field?.id,
        disabled: disabled ?? field?.disabled,
        'aria-describedby': [describedBy, field?.helperId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': invalid || undefined,
        invalid,
    };
};

type FieldProps = ComponentProps<'div'> & {
    invalid?: boolean;
    disabled?: boolean;
};

/** Label, control and helper text stacked, as in the library's input wrapper. */
export const Field = ({ invalid = false, disabled = false, className, ...props }: FieldProps) => {
    const id = useId();
    const [helperId, setHelperId] = useState<string>();
    const value = useMemo(
        () => ({ id, labelId: `${id}-label`, helperId, setHelperId, invalid, disabled }),
        [id, helperId, invalid, disabled],
    );

    return (
        <FieldContext.Provider value={value}>
            <div
                className={cn('group/field flex flex-col gap-2', className)}
                data-disabled={disabled || undefined}
                data-invalid={invalid || undefined}
                data-slot="field"
                {...props}
            />
        </FieldContext.Provider>
    );
};

export const FieldLabel = ({
    className,
    htmlFor,
    id,
    ...props
}: ComponentProps<typeof Label.Root>) => {
    const field = useField();

    return (
        <Label.Root
            className={cn('font-medium text-neutral-900 text-xs', className)}
            data-slot="field-label"
            htmlFor={htmlFor ?? field?.id}
            id={id ?? field?.labelId}
            {...props}
        />
    );
};

/** Follows the input like the library's helper: darker on hover and while typing. */
export const FieldHelper = ({ className, id, ...props }: ComponentProps<'p'>) => {
    const field = useField();
    const setHelperId = field?.setHelperId;
    const helperId = id ?? (field ? `${field.id}-helper` : undefined);

    // Controls only point aria-describedby at the helper once it actually exists.
    useEffect(() => {
        setHelperId?.(helperId);
        return () => setHelperId?.(undefined);
    }, [setHelperId, helperId]);

    return (
        <p
            className={cn(
                'font-normal text-xs transition-[color] duration-150',
                field?.invalid
                    ? 'text-error-500'
                    : field?.disabled
                      ? 'text-neutral-400'
                      : [
                            'text-neutral-500',
                            'group-has-[[data-slot=input]:hover,[data-slot=textarea]:hover]/field:text-neutral-600',
                            'group-has-[[data-slot=input]:focus-within,[data-slot=textarea]:focus]/field:text-neutral-900',
                        ],
                className,
            )}
            data-slot="field-helper"
            id={helperId}
            {...props}
        />
    );
};
