import { createEyes, type EyesContract, type Props } from "eyes-next";
import type { SectionKey } from "~/data/pages";
import type { ContactLinkId } from "~/modules/contact/components/contact-modal";
import type { ContactCardKey } from "~/modules/content/types";

declare global {
  interface Window {
    Eyes?: EyesContract;
  }
}

export type Events = {

  "Section Opened": {
    section: SectionKey;
    from: "home" | "island" | "footer" | "blog" | "about" | "direct";
  };
  "Contact Opened": { from: "pill" | "home" | "island" | "footer" };
  "Contact Clicked": {
    link: ContactCardKey | ContactLinkId;
    from: "modal" | "footer";
  };

  "Widget Opened": {
    widget: "on-rotation" | "gear";
    from: "home" | "island" | "room";
  };
  "Product Visited": { product: string };
  "Post Opened": { post: string };
  "UI/UX Item Opened": { item: string };
  "Photo Opened": { photo: string };
  "Photo View Changed": { view: "table" | "grid" };
  "Artwork Opened": { artwork: string };
  "Record Played": { record: string; artist: string };
  "Day Played": undefined;
  "Setting Changed": {
    setting: "animations" | "sound" | "3d";
    enabled: boolean;
    from: "settings" | "toast";
  };
};

const eyes = createEyes<Events>();

export const { useEyes } = eyes;

// The script loads after the page, and the SDK drops whatever is tracked
// before it's there, like a section loaded directly. Early calls wait this long.
const EARLY_WAIT = 10_000;
const early: (() => void)[] = [];

export const track: typeof eyes.track = (...args) => {
  if (typeof window === "undefined") return;
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
