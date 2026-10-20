export const OPEN_WIDGET_EVENT = "open-widget";

export interface OpenWidgetDetail {
  id: string;
  from: "home" | "island" | "room";
}

export const openWidget = (id: string, from: OpenWidgetDetail["from"]) =>
  !window.dispatchEvent(
    new CustomEvent<OpenWidgetDetail>(OPEN_WIDGET_EVENT, {
      detail: { id, from },
      cancelable: true,
    }),
  );
