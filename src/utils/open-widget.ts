// Widgets like About open as a modal on the home screen, which owns their
// state. This lets the island ask for one from anywhere.
export const OPEN_WIDGET_EVENT = "open-widget";

/** Asks the home screen to open a widget. Returns whether anything took it. */
export const openWidget = (id: string) =>
  !window.dispatchEvent(
    new CustomEvent(OPEN_WIDGET_EVENT, { detail: id, cancelable: true }),
  );
