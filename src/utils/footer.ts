
export const OPEN_FOOTER_EVENT = "open-footer";

export const scrollerOf = (element: Element | null) =>
  element?.closest<HTMLElement>("[data-section-scroll]") ?? null;

export const isFooterClosed = (element: Element) => {
  const state = element.closest<HTMLElement>("[data-footer]")?.dataset.footer;
  return !state || state === "closed";
};

export const openFooter = (from: Element) =>
  from.dispatchEvent(new CustomEvent(OPEN_FOOTER_EVENT, { bubbles: true }));
