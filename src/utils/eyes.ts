import { createEyes } from "eyes-next";

// Eyes tracks pageviews and outbound links by itself. These are the events
// the site sends on top. A type, not an interface: createEyes wants a map it
// can index by name
export type Events = {
  // A row in the contact modal. The email row is a mailto: link, which
  // outbound tracking doesn't count
  "Contact Clicked": { service: string };
};

export const { useEyes, track } = createEyes<Events>();
