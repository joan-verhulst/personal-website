import { createEyes } from "eyes-next";

// Eyes tracks pageviews and outbound links by itself. These are the events
// the site sends on top. A type, not an interface: createEyes wants a map it
// can index by name
export type Events = {
  // A widget opening over the home screen, from its card or from the island.
  // They're modals, not pages, so pageviews miss them
  "Widget Opened": { widget: string };
  // A row in the contact modal. The email row is a mailto: link, which
  // outbound tracking doesn't count
  "Contact Clicked": { service: string };
  // A piece on the UI/UX wall, opened in its modal
  "UI/UX Item Opened": { item: string };
  // A print on the photography table, opened up close
  "Photo Opened": { photo: string };
  // The photography section switching between the table and the grid
  "Photo View Changed": { view: "table" | "grid" };
  // A record put on by hand, not the next one coming up by itself
  "Record Played": { record: string; artist: string };
  // Animations or sound turned on or off, from the settings or the toast
  "Setting Changed": { setting: "animations" | "sound"; enabled: boolean };
};

export const { useEyes, track } = createEyes<Events>();
