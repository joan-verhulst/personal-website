import type { ComponentProps } from "react";
import cn from "~/utils/cn";

interface PageProps extends ComponentProps<"div"> {
  width?: "collection" | "form";
}

const Page = ({ width = "collection", className, ...props }: PageProps) => (
  <div
    className={cn(
      "mx-auto flex w-full min-w-0 flex-col gap-4",
      width === "form" && "max-w-[720px]",
      className,
    )}
    {...props}
  />
);

export default Page;
