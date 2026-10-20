"use client";

import {
  type ElementType,
  type ComponentPropsWithoutRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import useTextAnimation from "~/modules/core/hooks/use-text-animation";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

type TriggerMode = "load" | "hover" | "manual";

export interface AnimatedTextHandle {
  triggerAnimation: () => void;
  resetAnimation: () => void;
  resplit: () => void;
}

interface AnimatedTextOwnProps {
  as?: ElementType;
  children: React.ReactNode;
  trigger?: TriggerMode;
  delay?: number;
  duration?: number;
  stagger?: number;
  className?: string;
  hoverRef?: React.RefObject<HTMLElement | null>;
}

type AnimatedTextProps = AnimatedTextOwnProps &
  Omit<ComponentPropsWithoutRef<"span">, keyof AnimatedTextOwnProps>;

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
    const { animationsEnabled } = useAnimationPreference();
    const { ref, triggerAnimation, resetAnimation, resplit } = useTextAnimation(
      {
        trigger,
        delay,
        duration,
        stagger,
        hoverRef,
        animationsEnabled,
      },
    );

    useImperativeHandle(forwardedRef, () => ({
      triggerAnimation,
      resetAnimation,
      resplit,
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
