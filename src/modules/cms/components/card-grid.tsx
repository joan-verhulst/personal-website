import type { ComponentProps } from "react";
import cn from "~/utils/cn";

type CardGridSize = "default" | "compact";

/**
 * The grid's classes on their own, for a grid that has to be a list:
 * <ol className={cardGridClass()}>.
 */
export const cardGridClass = (size: CardGridSize = "default") =>
  cn(
    "grid grid-cols-2",
    size === "compact"
      ? "gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
      : "gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  );

interface CardGridProps extends ComponentProps<"div"> {
  /** "compact" fits smaller cards, for a grid inside a dialog. */
  size?: CardGridSize;
}

/**
 * The responsive grid of cards on a collection page: two columns on a phone,
 * up to four in the full 960px page. From sm up it fits as many columns as
 * the room it gets allows, so the cards keep their size next to the sidebar
 * on a small laptop too.
 *
 * @example
 * <CardGrid>
 *   {prints.map((print) => <MediaCard key={print.id} ... />)}
 * </CardGrid>
 */
const CardGrid = ({ size = "default", className, ...props }: CardGridProps) => (
  <div className={cn(cardGridClass(size), className)} {...props} />
);

export default CardGrid;
