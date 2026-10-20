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
  labels?: string[];
  pointed?: number | null;
  count?: number;
  children: ReactNode;
}

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
