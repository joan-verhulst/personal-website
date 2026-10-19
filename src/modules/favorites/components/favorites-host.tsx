"use client";

import { useEffect, useState } from "react";
import { widgets } from "~/data/widgets";
import FavoritesModal from "~/modules/favorites/components/favorites-modal";
import Gear from "~/modules/favorites/components/gear";
import OnRotation from "~/modules/favorites/components/on-rotation";
import { track } from "~/utils/eyes";
import { OPEN_WIDGET_EVENT, type OpenWidgetDetail } from "~/utils/open-widget";

type Favorite = "on-rotation" | "gear";

const isFavorite = (id: string): id is Favorite =>
  id === "on-rotation" || id === "gear";

/**
 * On Rotation and Gear in their modals, for every page. Opened by their
 * tiles on home and in the island's tray, and from the room on the about
 * page, see openWidget. The about page has both on it as well.
 */
const FavoritesHost = () => {
  const [open, setOpen] = useState<Favorite | null>(null);

  useEffect(() => {
    const handleWidget = (event: Event) => {
      const { id, from } = (event as CustomEvent<OpenWidgetDetail>).detail;
      if (!isFavorite(id)) return;
      // Tells the island it was taken care of, so it stays on this page
      event.preventDefault();
      track("Widget Opened", { widget: id, from });
      setOpen(id);
    };

    window.addEventListener(OPEN_WIDGET_EVENT, handleWidget);
    return () => window.removeEventListener(OPEN_WIDGET_EVENT, handleWidget);
  }, []);

  const close = () => setOpen(null);

  return (
    <>
      <FavoritesModal
        title={widgets.onRotation.label}
        isOpen={open === "on-rotation"}
        onClose={close}
      >
        <OnRotation />
      </FavoritesModal>
      <FavoritesModal
        title={widgets.gear.label}
        isOpen={open === "gear"}
        onClose={close}
      >
        <Gear />
      </FavoritesModal>
    </>
  );
};

export default FavoritesHost;
