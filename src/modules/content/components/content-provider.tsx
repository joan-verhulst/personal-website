"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Content } from "~/modules/content/types";

const ContentContext = createContext<Content | null>(null);

interface Props {
  content: Content;
  children: ReactNode;
}

/** Hands the content read on the server to the client components below. */
const ContentProvider = ({ content, children }: Props) => (
  <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
);

export const useContent = () => {
  const content = useContext(ContentContext);
  if (!content) {
    throw new Error("useContent must be used inside a ContentProvider");
  }
  return content;
};

export default ContentProvider;
