'use client';

import { useState } from 'react';

/**
 * Radix ToggleGroup lets a single group go empty when the active item is
 * clicked again. Segmented controls and the dock must always keep one value.
 */
export const useSingleValue = (
    value: string | undefined,
    defaultValue: string | undefined,
    onValueChange: ((value: string) => void) | undefined,
) => {
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');

    const select = (next: string) => {
        if (!next) return;
        if (value === undefined) setUncontrolled(next);
        onValueChange?.(next);
    };

    return [value ?? uncontrolled, select] as const;
};
