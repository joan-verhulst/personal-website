// The contact modal lives once in the main layout, see ContactHost, so the
// pill next to the island opens the same one from any page.
export const OPEN_CONTACT_EVENT = "open-contact";

export interface OpenContactDetail {
  from: "pill" | "widget";
}

/** Opens the contact modal. */
export const openContact = (detail: OpenContactDetail) =>
  window.dispatchEvent(new CustomEvent(OPEN_CONTACT_EVENT, { detail }));
