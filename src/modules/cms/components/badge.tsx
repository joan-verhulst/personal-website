import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import cn from "~/utils/cn";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 font-medium text-xs [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-neutral-950/10 bg-neutral-100 text-neutral-700",
        primary: "border-primary-200 bg-primary-100 text-primary-900",
        success: "border-success-200 bg-success-100 text-success-800",
        warning: "border-warning-200 bg-warning-100 text-warning-800",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type Props = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

/** A status label, like "Cover" or "Not saved", in a table cell or on a card. */
const Badge = ({ tone, className, ...props }: Props) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props} />
);

export default Badge;
