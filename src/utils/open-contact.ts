export const OPEN_CONTACT_EVENT = "open-contact";

export interface OpenContactDetail {
  from: "pill" | "home";
}

export const openContact = (detail: OpenContactDetail) =>
  window.dispatchEvent(new CustomEvent(OPEN_CONTACT_EVENT, { detail }));
