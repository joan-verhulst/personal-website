// The footer under every page, see core/hooks/use-curtain.ts. Pages that
// take scrolling over for gestures of their own reach it through these

export const OPEN_FOOTER_EVENT = "open-footer";

/** Where a page scrolls: the layer's scroller when open over home, else the window. */
export const scrollerOf = (element: Element | null) =>
  element?.closest<HTMLElement>("[data-section-scroll]") ?? null;

/**
 * Whether the footer under the page around an element is closed and nobody
 * is pulling it. Otherwise a wheel over the page is the footer's, so
 * elements that handle the wheel themselves leave it alone.
 */
export const isFooterClosed = (element: Element) => {
  const state = element.closest<HTMLElement>("[data-footer]")?.dataset.footer;
  return !state || state === "closed";
};

/**
 * Lifts the page around an element off its footer, for a pull past the end
 * of something that takes touches itself, like a slider or the photo table.
 * Mark those with data-gestures, so the footer leaves their touches alone.
 */
export const openFooter = (from: Element) =>
  from.dispatchEvent(new CustomEvent(OPEN_FOOTER_EVENT, { bubbles: true }));
