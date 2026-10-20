import { ArrowUpRight } from "lucide-react";
import { Google_Sans_Code } from "next/font/google";
import type { PropsWithChildren, ReactNode, Ref } from "react";
import cn from "~/utils/cn";

export const codeFont = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-code",
});

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
      "font-light text-lg text-neutral-950/75 leading-relaxed",
      "[&>p]:mt-4",
      isRoomy ? "[&>h2]:mt-32" : "[&>h2]:mt-14",
      "[&>h2]:mb-1 [&>h2]:scroll-mt-28 [&>h2]:text-balance [&>h2]:font-normal [&>h2]:text-neutral-950 [&>h2]:text-xl [&>h2]:leading-snug md:[&>h2]:text-2xl",
      "[&>h3]:mt-10 [&>h3]:mb-1 [&>h3]:scroll-mt-28 [&>h3]:font-normal [&>h3]:text-lg [&>h3]:text-neutral-950",
      "[&>ol]:mt-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mt-4 [&>ul]:list-disc [&>ul]:pl-5 [&_li::marker]:text-neutral-950/35 [&_li]:mt-1.5 [&_li]:pl-1",
      "[&_strong]:font-normal [&_strong]:text-neutral-950",
      "[&_a]:text-neutral-950 [&_a]:underline [&_a]:decoration-neutral-950/25 [&_a]:underline-offset-3 hover:[&_a]:decoration-neutral-950",
      "[&_:not(pre)>code]:font-(family-name:--font-code) [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-neutral-950/6 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-neutral-950",
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

const FigmaLogo = () => (
  <svg aria-hidden="true" viewBox="0 0 38 57" className="h-5 w-auto">
    <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
    <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
    <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
    <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
    <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
  </svg>
);

/** A card linking out to Figma, e.g. to try a post's shader there. */
export const FigmaCard = ({ href, title, description }: { href: string; title: string; description?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group no-underline! mt-10 flex items-center gap-4 rounded-3xl border border-neutral-950/10 p-5 transition-colors duration-200 hover:border-neutral-950/20"
  >
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950/4">
      <FigmaLogo />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="font-normal text-base text-neutral-950">{title}</span>
      {description && <span className="text-neutral-950/60 text-sm">{description}</span>}
    </span>
    <ArrowUpRight className="size-4 shrink-0 text-neutral-950/50 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-950" />
  </a>
);
