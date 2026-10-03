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

// A card either links to a page or opens something, like an edit dialog
type MediaCardTarget =
  | {
      /**
       * The item's edit page, as a canonical path. The whole card links
       * there.
       */
      href: string;
      onClick?: never;
    }
  | {
      /** Runs when the card is clicked, in place of following a link. */
      onClick: () => void;
      href?: never;
    };

type MediaCardProps = MediaCardTarget & {
  title: ReactNode;
  /** A muted line under the title, like a year or a size. */
  meta?: ReactNode;
  /** One or more <Badge />s, shown over the top left of the image. */
  badge?: ReactNode;
  /** A <CardMenu />, shown top right on hover or keyboard focus. */
  actions?: ReactNode;
  /**
   * "auto" lets the image set its own shape. "4/3" and "square" give every
   * card the same shape and crop the image to fill it.
   */
  aspect?: "auto" | "4/3" | "square";
  /**
   * The image: a <MediaThumb />, a next/image in a sized box, and so on. With
   * aspect "auto" it sets its own aspect ratio. Left out, a grey placeholder
   * shows (4:3 unless aspect says otherwise). The card rounds and clips it,
   * so it needs no radius of its own.
   */
  children?: ReactNode;
  className?: string;
};

const aspectClasses = {
  "4/3": "aspect-4/3",
  square: "aspect-square",
} as const;

/**
 * An item in a <CardGrid />. The title's link (or button, with onClick)
 * stretches over the whole card, and the menu sits above it instead of
 * inside it, so opening the menu never follows the link and the markup stays
 * valid.
 *
 * @example
 * <MediaCard
 *   href={`/admin/ui-ux/items/${item.id}`}
 *   title={item.title}
 *   meta={tag.name}
 *   badge={isOnWall && <Badge tone="success">On the wall</Badge>}
 *   actions={
 *     <CardMenu label={`Actions for "${item.title}"`}>
 *       <DropdownMenuItem variant="danger" onSelect={onDelete}>Delete</DropdownMenuItem>
 *     </CardMenu>
 *   }
 * >
 *   <Image src={src} alt="" width={400} height={300} className="w-full" />
 * </MediaCard>
 *
 * @example
 * <MediaCard onClick={() => setEditing(record)} title={record.title} aspect="square">
 *   <Image src={src} alt="" fill sizes="240px" />
 * </MediaCard>
 */
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
        // Rings the card when its link or button has keyboard focus, but not
        // when the menu button does
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
            // A fixed shape crops whatever image it gets to fill the box
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
        // Always visible on touch screens, where there's no hover to reveal
        // it, and while one of its actions runs, so the spinner shows
        <div className="absolute top-3 right-3 z-10 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100 has-[[aria-busy=true]]:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * A card's shape while the collection loads: the same box, image and two
 * lines of text as a <MediaCard />, so nothing moves when the cards arrive.
 */
export const MediaCardSkeleton = ({
  aspect = "4/3",
}: {
  aspect?: keyof typeof aspectClasses;
}) => (
  <div className="flex min-w-0 flex-col rounded-xl border border-neutral-950/10 bg-white p-1">
    <Skeleton className={cn("w-full rounded-lg", aspectClasses[aspect])} />
    <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1.5 text-xs">
      {/* Each as tall as a line of the card's text */}
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
  /** The menu button's accessible name, like `Actions for "Sunset"`. */
  label: string;
  /** <DropdownMenuItem />s. */
  children: ReactNode;
  /** Spins the button while one of the menu's actions runs. */
  isPending?: boolean;
  /**
   * "tertiary" is a white button that reads on top of an image. "ghost" has
   * no box, for a table row.
   */
  variant?: "tertiary" | "ghost";
  /**
   * Runs as the menu closes, right before focus goes back to its button.
   * Start a dialog from here: it opens once focus is there, and returns it
   * to the button when it closes.
   */
  onCloseAutoFocus?: ComponentProps<
    typeof DropdownMenuContent
  >["onCloseAutoFocus"];
}

/** The ⋮ menu for a <MediaCard />'s actions slot, or for a table row. */
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
            // In a row the button keeps out of the row's height
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
