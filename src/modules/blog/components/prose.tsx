import { Google_Sans_Code } from "next/font/google";
import type { PropsWithChildren, ReactNode, Ref } from "react";
import cn from "~/utils/cn";

// Code in the posts, in the mono cut of the site's own typeface
export const codeFont = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-code",
});

/**
 * A post's body. Text sits in a reading column down the middle, and a Wide
 * child breaks out of it, for demos that need the room. Plain elements are
 * styled from here, so a post reads like the writing it is: p, h2, h3, ul,
 * ol, strong, em, a and code. Roomy spaces it the way the posts read: text
 * stays together, and 128px goes around everything else.
 */
export const Prose = ({
  isRoomy = false,
  className,
  ref,
  children,
}: PropsWithChildren<{
  isRoomy?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}>) => (
  <div
    ref={ref}
    className={cn(
      codeFont.variable,
      "grid grid-cols-[1fr_min(38rem,calc(100%-2.5rem))_1fr] *:col-start-2",
      // Text, at the site's own sizes: light body copy, headings that lead
      // by size and color rather than weight
      "font-light text-base text-neutral-950/75 leading-relaxed",
      "[&>p]:mt-4",
      // A section heading starts a new group
      isRoomy ? "[&>h2]:mt-32" : "[&>h2]:mt-14",
      "[&>h2]:mb-1 [&>h2]:scroll-mt-28 [&>h2]:text-balance [&>h2]:font-normal [&>h2]:text-lg [&>h2]:text-neutral-950 [&>h2]:leading-snug md:[&>h2]:text-xl",
      "[&>h3]:mt-10 [&>h3]:mb-1 [&>h3]:scroll-mt-28 [&>h3]:font-normal [&>h3]:text-base [&>h3]:text-neutral-950",
      "[&>ol]:mt-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mt-4 [&>ul]:list-disc [&>ul]:pl-5 [&_li::marker]:text-neutral-950/35 [&_li]:mt-1.5 [&_li]:pl-1",
      // Inline
      "[&_strong]:font-normal [&_strong]:text-neutral-950",
      "[&_a]:text-neutral-950 [&_a]:underline [&_a]:decoration-neutral-950/25 [&_a]:underline-offset-3 hover:[&_a]:decoration-neutral-950",
      "[&_:not(pre)>code]:font-(family-name:--font-code) [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-neutral-950/6 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-neutral-950",
      // Roomy: text keeps its own spacing, and 128px goes around everything
      // that isn't text, a demo (a div), a code block (a figure) or a callout
      // (an aside). One of those right under a heading stays by it, and the
      // first block sits flush, so the layout above sets the gap to it
      isRoomy && [
        "[&>:is(div,figure,aside)]:mt-32 [&>:is(div,figure,aside)]:mb-0",
        "[&>:is(div,figure,aside)+:is(p,ul,ol,h3)]:mt-32",
        "[&>:is(h2,h3)+:is(div,figure,aside)]:mt-8",
        "[&>*:first-child]:mt-0",
      ],
      className,
    )}
  >
    {children}
  </div>
);

/** Breaks out of the reading column, up to a wider one. */
export const Wide = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => (
  <div
    className={cn(
      // Over the column the prose puts every child in
      "col-span-full! mx-auto mt-10 mb-4 w-[min(60rem,calc(100%-2rem))]",
      className,
    )}
  >
    {children}
  </div>
);

type CalloutKind = "aside" | "glitch" | "source";

const CALLOUT_LABELS: Record<CalloutKind, string> = {
  aside: "Aside",
  glitch: "Glitch?",
  source: "Where this comes from",
};

/**
 * Set off from the text: a thought on the side, something that went wrong,
 * or where an idea was borrowed from.
 */
export const Callout = ({
  kind = "aside",
  title,
  children,
}: PropsWithChildren<{ kind?: CalloutKind; title?: ReactNode }>) => (
  <aside
    className={cn(
      "mt-6 rounded-3xl px-5 py-4 text-sm leading-relaxed md:px-6 md:py-5",
      kind === "glitch"
        ? "bg-warning-50 text-neutral-950/80"
        : "bg-neutral-950/4 text-neutral-950/75",
      "[&>p+p]:mt-3",
    )}
  >
    <span
      className={cn(
        "mb-1.5 block text-xs",
        kind === "glitch" ? "text-warning-700" : "text-neutral-950/50",
      )}
    >
      {title ?? CALLOUT_LABELS[kind]}
    </span>
    {children}
  </aside>
);
