import cn from "~/utils/cn";

// The site's pill buttons. Hovering darkens a light button and lightens a
// dark one, instead of fading it
const TONES = {
  primary: "bg-primary-500 text-neutral-50 hover:bg-primary-600",
  dark: "bg-neutral-950 text-neutral-50 hover:bg-neutral-800",
  light: "bg-neutral-50 text-neutral-950 hover:bg-neutral-200",
  // For a second button next to a primary one, or on a white card
  quiet: "bg-neutral-100 text-neutral-950 hover:bg-neutral-200",
};

export type ButtonTone = keyof typeof TONES;

/** A pill button or link, as on the wall item modal. */
export const buttonClass = (tone: ButtonTone, className?: string) =>
  cn(
    "flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
    TONES[tone],
    className,
  );
