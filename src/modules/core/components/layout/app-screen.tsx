"use client";

import { type PropsWithChildren, useEffect, useLayoutEffect } from "react";
import { siteData } from "~/data/site";
import { leaveScreen, showScreen } from "~/utils/app-layer";

interface Props {
  title: string;
}

const AppScreen = ({ title, children }: PropsWithChildren<Props>) => {
  useLayoutEffect(() => {
    showScreen(children);
    return leaveScreen;
  }, [children]);

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
