"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface PageActionsContextValue {
  slot: HTMLElement | null;
  setSlot: (node: HTMLElement | null) => void;
  hasActions: boolean;
  hasWideActions: boolean;
  register: (isCompact: boolean) => () => void;
}

const PageActionsContext = createContext<PageActionsContextValue | null>(null);

const usePageActionsContext = () => {
  const context = useContext(PageActionsContext);

  if (!context) {
    throw new Error("PageActions must be used inside the CMS layout");
  }

  return context;
};

export const PageActionsProvider = ({ children }: { children: ReactNode }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [counts, setCounts] = useState({ all: 0, wide: 0 });

  const register = useCallback((isCompact: boolean) => {
    const wide = isCompact ? 0 : 1;
    setCounts((current) => ({
      all: current.all + 1,
      wide: current.wide + wide,
    }));
    return () =>
      setCounts((current) => ({
        all: current.all - 1,
        wide: current.wide - wide,
      }));
  }, []);

  const value = useMemo(
    () => ({
      slot,
      setSlot,
      hasActions: counts.all > 0,
      hasWideActions: counts.wide > 0,
      register,
    }),
    [slot, counts, register],
  );

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
};

export const usePageActionsSlot = () => {
  const { setSlot, hasActions, hasWideActions } = usePageActionsContext();
  return { setSlot, hasActions, hasWideActions };
};

interface PageActionsProps {
  children: ReactNode;
  isCompact?: boolean;
}

const PageActions = ({ children, isCompact = false }: PageActionsProps) => {
  const { slot, register } = usePageActionsContext();

  // Before paint, so the + button never flashes on a page with its own actions
  useLayoutEffect(() => register(isCompact), [register, isCompact]);

  return slot ? createPortal(children, slot) : null;
};

export default PageActions;
