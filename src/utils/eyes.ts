import { createEyes, type EyesContract, type Props } from "eyes-next";
import type { SectionKey } from "~/data/pages";
import type { ContactLinkId } from "~/modules/contact/components/contact-modal";
import type { ContactCardKey } from "~/modules/content/types";

declare global {
  interface Window {
    // Set by the tracker's script once it has loaded
    Eyes?: EyesContract;
  }
}

// Eyes tracks pageviews and outbound links by itself. These are the events
// the site sends on top. A type, not an interface: createEyes wants a map it
// can index by name
export type Events = {
  // The first three are the funnel in Eyes: a section, then the ways to get
  // in touch, then reaching out

  // A section opening, and how: its card on home, the island's tray, the
  // footer, or directly, by a link from elsewhere or the browser's history.
  // Pageviews alone miss a switch from one section to another, see AppLayer
  "Section Opened": {
    section: SectionKey;
    from: "home" | "island" | "footer" | "direct";
  };
  // The ways to get in touch coming up: the contact modal, from the pill
  // next to the island, the contact widget on home or its tile in the
  // island's tray, or the footer, which has the page's card and the same links
  "Contact Opened": { from: "pill" | "home" | "island" | "footer" };
  // Reaching out: a card's button or a link under Elsewhere, in the modal or
  // the footer. Emails are mailto: links, which outbound tracking doesn't count
  "Contact Clicked": {
    link: ContactCardKey | ContactLinkId;
    from: "modal" | "footer";
  };

  // A widget opening over the home screen, from its card or from the
  // island's tray. They're modals, not pages, so pageviews miss them
  "Widget Opened": { widget: string; from: "home" | "island" };
  // A product's link in the products widget
  "Product Visited": { product: string };
  // An experiment's link in the experiments widget
  "Experiment Visited": { experiment: string };
  // A piece on the UI/UX wall, opened in its modal
  "UI/UX Item Opened": { item: string };
  // A print on the photography table, opened up close
  "Photo Opened": { photo: string };
  // The photography section switching between the table and the grid
  "Photo View Changed": { view: "table" | "grid" };
  // A piece of digital art, opened full screen
  "Artwork Opened": { artwork: string };
  // A record put on by hand, not the next one coming up by itself
  "Record Played": { record: string; artist: string };
  // The sky in the footer played through the last 24 hours
  "Day Played": undefined;
  // Animations or sound turned on or off, from the settings or the toast
  "Setting Changed": {
    setting: "animations" | "sound";
    enabled: boolean;
    from: "settings" | "toast";
  };
};

const eyes = createEyes<Events>();

export const { useEyes } = eyes;

// The script loads after the page, and the SDK drops whatever is tracked
// before it's there, like a section that was loaded directly. That waits
// here instead, until the script is in or this long has passed, as when it's
// blocked
const EARLY_WAIT = 10_000;
const early: (() => void)[] = [];

export const track: typeof eyes.track = (...args) => {
  if (typeof window === "undefined") return;
  // The event map has checked them, the tracker takes any name
  const [name, props] = args as [string, Props?];
  const send = () => window.Eyes?.track(name, props);
  // In order, behind any still waiting
  if (window.Eyes && early.length === 0) {
    send();
    return;
  }

  early.push(send);
  if (early.length > 1) return;

  const since = Date.now();
  const timer = setInterval(() => {
    if (!window.Eyes && Date.now() - since < EARLY_WAIT) return;
    clearInterval(timer);
    for (const call of early.splice(0)) call();
  }, 100);
};
