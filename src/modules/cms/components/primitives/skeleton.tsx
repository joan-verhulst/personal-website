import type { HTMLAttributes } from "react";
import cn from "~/utils/cn";

const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse rounded-md bg-neutral-950/5", className)}
    {...props}
  />
);

export { Skeleton };
