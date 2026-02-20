"use client";

import {
  type ElementType,
  type ComponentPropsWithoutRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import useTextAnimation from "~/modules/core/hooks/use-text-animation";

type TriggerMode = "load" | "hover" | "manual";

export interface AnimatedTextHandle {
  triggerAnimation: () => void;
  resetAnimation: () => void;
}

interface AnimatedTextOwnProps {
  as?: ElementType;
  children: React.ReactNode;
  trigger?: TriggerMode;
  delay?: number;
  duration?: number;
  stagger?: number;
  className?: string;
  /** For hover mode: optionally provide a parent element ref to listen for hover */
  hoverRef?: React.RefObject<HTMLElement | null>;
}

type AnimatedTextProps = AnimatedTextOwnProps &
  Omit<ComponentPropsWithoutRef<"span">, keyof AnimatedTextOwnProps>;

/**
 * A component that animates text by lines on load, hover, or manually.
 *
 * @param as - The HTML element type to render. Default is "span".
 * @param children - The text content to animate.
 * @param trigger - When to trigger: "load", "hover", or "manual". Default is "load".
 * @param delay - Delay before animation starts (seconds). Default is 0.
 * @param duration - Duration of each line animation (seconds). Default is 0.5.
 * @param stagger - Delay between each line animation (seconds). Default is 0.08.
 * @param className - Additional CSS classes to apply.
 * @param hoverRef - For hover mode: optionally provide a parent element ref to listen for hover.
 * @param ref - Exposes triggerAnimation() and resetAnimation() methods for manual control.
 */
const AnimatedText = forwardRef<AnimatedTextHandle, AnimatedTextProps>(
  (
    {
      as: Component = "span",
      children,
      trigger = "load",
      delay = 0,
      duration = 0.5,
      stagger = 0.1,
      className,
      hoverRef,
      ...props
    },
    forwardedRef,
  ) => {
    const { ref, triggerAnimation, resetAnimation } = useTextAnimation({
      trigger,
      delay,
      duration,
      stagger,
      hoverRef,
    });

    useImperativeHandle(forwardedRef, () => ({
      triggerAnimation,
      resetAnimation,
    }));

    return (
      <Component
        ref={ref as React.RefObject<HTMLElement>}
        className={className}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

AnimatedText.displayName = "AnimatedText";

export default AnimatedText;
