"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import cn from "~/utils/cn";

// Spark's on and off tracks were two greys that were hard to tell apart, so
// the on track is the primary colour here
const Switch = ({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitives.Root>) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-500 data-[state=unchecked]:bg-neutral-950/15",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
);

export { Switch };
export default Switch;
