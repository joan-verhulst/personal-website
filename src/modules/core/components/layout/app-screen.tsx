"use client";

import { type PropsWithChildren, useEffect, useLayoutEffect } from "react";
import { siteData } from "~/data/site";
import { leaveScreen, showScreen } from "~/utils/app-layer";

interface Props {
  // Shown in the tab, like the page's own metadata does when loaded directly
  title: string;
}

/**
 * Hands a section to the layer over the home screen instead of rendering it
 * in place. Next unmounts a route the moment you leave it, the layer keeps the
 * section on screen until it has closed into its tile.
 */
const AppScreen = ({ title, children }: PropsWithChildren<Props>) => {
  // Layout effect, so the section is in the card before the next paint
  useLayoutEffect(() => {
    showScreen(children);
    return leaveScreen;
  }, [children]);

  // Next takes the title from the page under the layer, which is still home
  useEffect(() => {
    const previous = document.title;
    document.title = siteData.metadata.titleTemplate.replace("%s", title);

    return () => {
      document.title = previous;
    };
  }, [title]);

  return null;
};

export default AppScreen;
