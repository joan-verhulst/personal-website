"use client";

import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  claimControls,
  getServerState,
  getState,
  releaseControls,
  subscribe,
} from "~/utils/island-controls";

interface Props {
  // The things on the page in order, like the pieces of digital art
  labels?: string[];
  // Which of them the island names instead of the section, if any
  pointed?: number | null;
  // Stands in for the section's count, like the piece that's showing
  count?: number;
  children: ReactNode;
}

/**
 * Puts a page's controls in the island, under its label. The page keeps their
 * state, they only render up there. Styled for the island: light on dark.
 */
const IslandControls = ({ labels, pointed, count, children }: Props) => {
  const owner = useId();
  const { slot } = useSyncExternalStore(subscribe, getState, getServerState);

  useLayoutEffect(() => {
    claimControls({ owner, labels, pointed, count });
  }, [owner, labels, pointed, count]);

  useLayoutEffect(() => () => releaseControls(owner), [owner]);

  return slot ? createPortal(children, slot) : null;
};

export default IslandControls;
