
export interface Controls {
  // The page that owns them, so one that's leaving can't clear the next
  owner: string;
  // The things on the page in order, like the pieces of digital art
  labels?: string[];
  pointed?: number | null;
  count?: number;
}

interface State {
  slot: HTMLElement | null;
  controls: Controls | null;
}

let state: State = { slot: null, controls: null };
const listeners = new Set<() => void>();

const setState = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getState = () => state;

const initialState = state;
export const getServerState = () => initialState;

export const setSlot = (slot: HTMLElement | null) => setState({ slot });

/** The newest page wins, as the next one mounts before the last is gone. */
export const claimControls = (controls: Controls) => setState({ controls });

export const releaseControls = (owner: string) => {
  if (state.controls?.owner === owner) setState({ controls: null });
};
