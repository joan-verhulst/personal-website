"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "three-d-enabled";
export const THREE_D_EVENT = "three-d-preference-change";

let thisVisit: boolean | null = null;

export const isThreeDEnabled = () => {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return thisVisit ?? true;
  }
};

export const setThreeDEnabled = (enabled: boolean) => {
  thisVisit = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
  }
  window.dispatchEvent(new CustomEvent(THREE_D_EVENT, { detail: enabled }));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(THREE_D_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THREE_D_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export const useThreeD = () => useSyncExternalStore(subscribe, isThreeDEnabled, () => true);
