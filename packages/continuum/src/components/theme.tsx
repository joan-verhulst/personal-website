'use client';

import { Slot } from 'radix-ui';
import { type ComponentProps, createContext, type ReactNode, useContext, useMemo } from 'react';
import { cn } from '../lib/cn';

export const themes = ['eyes', 'indigo', 'electric', 'lime', 'stone', 'violet'] as const;

export type ThemeName = (typeof themes)[number];
export type ThemeMode = 'light' | 'dark';

type ThemeValue = { theme: ThemeName; mode: ThemeMode };

const ThemeContext = createContext<ThemeValue>({ theme: 'eyes', mode: 'light' });

export const useTheme = () => useContext(ThemeContext);

type ThemeProps = ComponentProps<'div'> &
    Partial<ThemeValue> & {
        asChild?: boolean;
    };

/**
 * Opens a themed scope. Everything the system styles has to sit inside one,
 * because the tokens and the built stylesheet only apply under `.pds`.
 */
export const Theme = ({ theme, mode, asChild, className, ...props }: ThemeProps) => {
    const parent = useTheme();
    const value = useMemo(
        () => ({ theme: theme ?? parent.theme, mode: mode ?? parent.mode }),
        [theme, mode, parent.theme, parent.mode],
    );
    const Component = asChild ? Slot.Root : 'div';

    return (
        <ThemeContext.Provider value={value}>
            <Component
                className={cn('pds', className)}
                data-mode={value.mode}
                data-theme={value.theme}
                {...props}
            />
        </ThemeContext.Provider>
    );
};

/**
 * Re-opens the current theme inside a portal. Radix renders menus, tooltips and
 * dialogs at the end of the body, outside the scope that styles them.
 */
export const ThemeScope = ({ children }: { children: ReactNode }) => {
    const { theme, mode } = useTheme();

    return (
        <div className="pds contents" data-mode={mode} data-theme={theme}>
            {children}
        </div>
    );
};
