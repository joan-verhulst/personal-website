import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import AdminLink from "~/modules/cms/components/admin-link";
import cn from "~/utils/cn";

export const buttonVariants = cva(
  "inline-flex w-fit cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-full bg-primary-500 text-white hover:bg-primary-600",
        tertiary:
          "rounded-[10px] border border-neutral-950/10 bg-white text-neutral-950 hover:bg-neutral-100",
        ghost:
          "rounded-[10px] text-neutral-700 hover:bg-neutral-950/5 hover:text-neutral-950",
        // A tint rather than a fill, so a delete never outshouts the main action
        danger:
          "rounded-[10px] bg-error-500/20 text-error-500 hover:bg-error-500/30",
      },
      size: {
        default: "h-[33px] px-3",
        sm: "h-7 px-2.5",
        icon: "size-[33px] shrink-0 rounded-[10px] p-0",
        "icon-sm": "size-7 pointer-coarse:size-9 shrink-0 rounded-[10px] p-0",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: ["icon", "icon-sm"],
        className: "rounded-full",
      },
    ],
    defaultVariants: {
      variant: "tertiary",
      size: "default",
    },
  },
);

type Size = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

interface BaseProps
  extends Omit<VariantProps<typeof buttonVariants>, "size">,
    ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  href?: string;
  withArrow?: boolean;
  isPending?: boolean;
}

type ButtonProps = BaseProps &
  (
    | { size?: Exclude<Size, "icon" | "icon-sm"> | null }
    | { size: "icon" | "icon-sm"; "aria-label": string }
  );

const Button = ({
  className,
  href,
  children,
  ref,
  variant,
  size,
  withArrow,
  isPending,
  disabled,
  type = "button",
  ...props
}: ButtonProps) => {
  const isIcon = size === "icon" || size === "icon-sm";
  const spinner = <LoaderCircle className="animate-spin" size={16} />;
  const classes = cn(buttonVariants({ variant, size }), className);

  const content = isPending ? (
    isIcon ? (
      spinner
    ) : (
      <>
        {children}
        {spinner}
      </>
    )
  ) : (
    <>
      {children}
      {withArrow && <ArrowRight size={16} />}
    </>
  );

  if (href) {
    return (
      <AdminLink
        ref={ref as Ref<HTMLAnchorElement>}
        className={classes}
        aria-disabled={disabled || isPending || undefined}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        href={href}
      >
        {content}
      </AdminLink>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;
