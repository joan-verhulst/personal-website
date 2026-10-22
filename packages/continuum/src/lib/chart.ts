// Tailwind inlines the theme, so the --color-chart-* aliases are not guaranteed at runtime.
export const resolveChartColor = (color: string) =>
    /^chart-[1-5]$/.test(color) ? `var(--pds-${color})` : color;
