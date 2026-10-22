import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: ['xxs'],
            radius: ['chip', 'item', 'control', 'control-lg', 'card', 'panel', 'dock'],
            shadow: ['float', 'sheet', 'action'],
        },
    },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
