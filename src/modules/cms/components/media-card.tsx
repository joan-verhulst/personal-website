import { EllipsisVertical } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import AdminLink from "~/modules/cms/components/admin-link";
import Button from "~/modules/cms/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/modules/cms/components/primitives/dropdown-menu";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/modules/cms/components/primitives/tooltip";
import cn from "~/utils/cn";

type MediaCardTarget =
  | {
      href: string;
      onClick?: never;
    }
  | {
      onClick: () => void;
      href?: never;
    };

type MediaCardProps = MediaCardTarget & {
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  aspect?: "auto" | "4/3" | "square";
  children?: ReactNode;
  className?: string;
};

const aspectClasses = {
  "4/3": "aspect-4/3",
  square: "aspect-square",
} as const;

const MediaCard = ({
  href,
  onClick,
  title,
  meta,
  badge,
  actions,
  aspect = "auto",
  children,
  className,
}: MediaCardProps) => {
  const targetClasses =
    "truncate font-medium text-neutral-950 text-xs outline-hidden after:absolute after:inset-0 after:rounded-xl";

  return (
    <div
      className={cn(
        "group/card relative flex min-w-0 flex-col rounded-xl border border-neutral-950/10 bg-white p-1 transition-colors hover:border-neutral-950/20 has-[[data-card-target]:focus-visible]:outline-2 has-[[data-card-target]:focus-visible]:outline-primary-500 has-[[data-card-target]:focus-visible]:outline-offset-2",
        className,
      )}
    >
      {/* This box is the one thing that rounds and clips the image. Its
          radius is the card's minus the padding between them, so both
          curves run parallel. */}
      <div className="relative overflow-hidden rounded-lg bg-neutral-100">
        <div
          className={cn(
            "transition-transform duration-300 group-hover/card:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100",
            aspect !== "auto" && [
              "relative [&>*]:size-full [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
              aspectClasses[aspect],
            ],
          )}
        >
          {children ?? (aspect === "auto" && <div className="aspect-4/3" />)}
        </div>
        {badge && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {badge}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-2 pt-2 pb-1.5">
        {href ? (
          <AdminLink
            href={href}
            data-card-target=""
            className={targetClasses}
          >
            {title}
          </AdminLink>
        ) : (
          <button
            type="button"
            onClick={onClick}
            data-card-target=""
            className={cn(
              "block w-full min-w-0 cursor-pointer text-left",
              targetClasses,
            )}
          >
            {title}
          </button>
        )}
        {meta && <p className="truncate text-neutral-600 text-xs">{meta}</p>}
      </div>
      {actions && (
        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100 has-[[aria-busy=true]]:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
};

export const MediaCardSkeleton = ({
  aspect = "4/3",
}: {
  aspect?: keyof typeof aspectClasses;
}) => (
  <div className="flex min-w-0 flex-col rounded-xl border border-neutral-950/10 bg-white p-1">
    <Skeleton className={cn("w-full rounded-lg", aspectClasses[aspect])} />
    <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1.5 text-xs">
      <div className="flex h-[1.25em] items-center">
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex h-[1.25em] items-center">
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  </div>
);

interface CardMenuProps {
  label: string;
  children: ReactNode;
  isPending?: boolean;
  variant?: "tertiary" | "ghost";
  onCloseAutoFocus?: ComponentProps<
    typeof DropdownMenuContent
  >["onCloseAutoFocus"];
}

export const CardMenu = ({
  label,
  children,
  isPending,
  variant = "tertiary",
  onCloseAutoFocus,
}: CardMenuProps) => (
  <DropdownMenu>
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant={variant}
            aria-label={label}
            isPending={isPending}
            className={variant === "ghost" ? "-my-1" : "shadow-xs"}
          >
            <EllipsisVertical size={16} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent>Actions</TooltipContent>
    </Tooltip>
    <DropdownMenuContent align="end" onCloseAutoFocus={onCloseAutoFocus}>
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default MediaCard;
