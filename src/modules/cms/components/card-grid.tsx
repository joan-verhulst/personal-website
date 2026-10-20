import type { ComponentProps } from "react";
import cn from "~/utils/cn";

type CardGridSize = "default" | "compact";

export const cardGridClass = (size: CardGridSize = "default") =>
  cn(
    "grid grid-cols-2",
    size === "compact"
      ? "gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
      : "gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  );

interface CardGridProps extends ComponentProps<"div"> {
  size?: CardGridSize;
}

const CardGrid = ({ size = "default", className, ...props }: CardGridProps) => (
  <div className={cn(cardGridClass(size), className)} {...props} />
);

export default CardGrid;
