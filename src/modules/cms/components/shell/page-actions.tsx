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
  /** The element in the bottom bar the actions render into. */
  slot: HTMLElement | null;
  setSlot: (node: HTMLElement | null) => void;
  /** Whether the open page has put actions in the bar. */
  hasActions: boolean;
  /** Whether those actions need the room of the tabs' labels on a phone. */
  hasWideActions: boolean;
  /** Tells the bar a page has actions. Returns the way to take that back. */
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

/**
 * Connects the pages to the bar at the bottom of the panel. The CMS layout
 * wraps the panel in it, nothing else needs to.
 */
export const PageActionsProvider = ({ children }: { children: ReactNode }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // Counts rather than flags, so two forms on one page don't clear each other
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

/** For the bottom bar: where the actions go, and whether there are any. */
export const usePageActionsSlot = () => {
  const { setSlot, hasActions, hasWideActions } = usePageActionsContext();
  return { setSlot, hasActions, hasWideActions };
};

interface PageActionsProps {
  children: ReactNode;
  /**
   * For a single round button, like the + of a page that adds something
   * else than the section's default. The tabs next to it keep their labels
   * on a phone.
   */
  isCompact?: boolean;
}

/**
 * Puts a page's important buttons (Save, Delete) in the bar at the bottom of
 * the panel instead of the page header. In UI/UX they take the place of the
 * round + button, on other pages the bar shows up just for them. A page that
 * saves uses <SaveActions />, which is built on this.
 *
 * Render it anywhere in the page, the buttons keep their state and handlers.
 * They leave the form's markup though, so a submit button needs form={id} to
 * reach its form.
 *
 * @example
 * <PageActions>
 *   <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *   <Button type="submit" form={FORM_ID} variant="primary" isPending={isPending}>
 *     Save
 *   </Button>
 * </PageActions>
 */
const PageActions = ({ children, isCompact = false }: PageActionsProps) => {
  const { slot, register } = usePageActionsContext();

  // Before paint, so the + button never flashes on a page with its own actions
  useLayoutEffect(() => register(isCompact), [register, isCompact]);

  return slot ? createPortal(children, slot) : null;
};

export default PageActions;
