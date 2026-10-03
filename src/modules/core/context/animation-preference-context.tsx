"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react";

const STORAGE_KEY = "animations-enabled";
export const ANIMATION_PREFERENCE_EVENT = "animation-preference-change";

interface AnimationPreferenceContextValue {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const AnimationPreferenceContext =
  createContext<AnimationPreferenceContextValue>({
    animationsEnabled: true,
    setAnimationsEnabled: () => {},
  });

export const AnimationPreferenceProvider = ({
  children,
}: PropsWithChildren) => {
  const [animationsEnabled, setAnimationsEnabledState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Sync from localStorage after hydration to avoid mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setAnimationsEnabledState(stored === "true");
    } else {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setAnimationsEnabledState(!prefersReduced);
    }
    setHydrated(true);
  }, []);

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent(ANIMATION_PREFERENCE_EVENT, { detail: enabled }),
    );
  };

  return (
    <AnimationPreferenceContext.Provider
      value={{ animationsEnabled, setAnimationsEnabled }}
    >
      {children}
    </AnimationPreferenceContext.Provider>
  );
};

export const useAnimationPreference = () =>
  useContext(AnimationPreferenceContext);
