// Widgets that open as a modal over whatever page is up: Contact, On Rotation
// and Gear. Their modals live once in the main layout, see ContactHost and
// FavoritesHost, so this opens one from anywhere.
export const OPEN_WIDGET_EVENT = "open-widget";

export interface OpenWidgetDetail {
  id: string;
  // Its tile on home, the island's tray, or the room on the about page
  from: "home" | "island" | "room";
}

/** Opens a widget's modal. Returns whether anything took it. */
export const openWidget = (id: string, from: OpenWidgetDetail["from"]) =>
  !window.dispatchEvent(
    new CustomEvent<OpenWidgetDetail>(OPEN_WIDGET_EVENT, {
      detail: { id, from },
      cancelable: true,
    }),
  );
