"use client";

import { type CSSProperties, type PropsWithChildren, type ReactNode, useId } from "react";
import { Wide } from "~/modules/blog/components/prose";
import cn from "~/utils/cn";

interface DemoProps {
  // Under the frame: what to try
  caption?: ReactNode;
  // The sliders and switches, under the picture
  controls?: ReactNode;
  className?: string;
}

/**
 * A live demo in a post: the picture, its controls under it, and a line on
 * what to try. Wider than the text, so there's room to see the detail.
 */
export const Demo = ({
  caption,
  controls,
  className,
  children,
}: PropsWithChildren<DemoProps>) => (
  <Wide>
    <figure>
      <div className="overflow-hidden rounded-4xl border border-neutral-950/10 bg-neutral-50">
        <div className={cn("relative", className)}>{children}</div>
        {controls && (
          <div className="grid gap-x-8 gap-y-4 border-neutral-950/10 border-t px-5 py-4 md:grid-cols-2 md:px-6 md:py-5 md:[&>*:nth-child(odd):last-child]:col-span-2">
            {controls}
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mx-auto mt-3 max-w-160 px-1 text-center font-light text-neutral-950/55 text-sm leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  </Wide>
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  // How the value reads, like "2.4 km"
  format?: (value: number) => string;
}

/** A labelled slider, with its value on the right. */
export const Slider = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format = (number) => number.toFixed(2),
}: SliderProps) => {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-xs">
        <label htmlFor={id} className="text-neutral-950/60">
          {label}
        </label>
        <output htmlFor={id} className="text-neutral-950 tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-950 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-950 [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110"
        style={
          {
            background: `linear-gradient(90deg, var(--color-neutral-950) ${fill}%, color-mix(in oklab, var(--color-neutral-950) 12%, transparent) ${fill}%)`,
          } as CSSProperties
        }
      />
    </div>
  );
};

interface ChoiceProps<Value extends string | number> {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}

/** A row of options, one of them picked. */
export const Choice = <Value extends string | number>({
  label,
  value,
  options,
  onChange,
}: ChoiceProps<Value>) => (
  <fieldset className="flex flex-col gap-2">
    <legend className="mb-2 text-neutral-950/60 text-xs">{label}</legend>
    <div className="flex flex-wrap gap-1 rounded-2xl border border-neutral-950/10 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 flex-1 cursor-pointer whitespace-nowrap rounded-xl px-2.5 text-xs transition-colors duration-200",
            option.value === value
              ? "bg-neutral-950 text-neutral-50"
              : "text-neutral-950/60 hover:bg-neutral-950/5 hover:text-neutral-950",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  </fieldset>
);
