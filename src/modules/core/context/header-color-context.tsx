"use client";

import { createContext, useContext, useState, type PropsWithChildren } from "react";

interface HeaderColorContextValue {
  headerColor: string | null;
  setHeaderColor: (color: string | null) => void;
}

const HeaderColorContext = createContext<HeaderColorContextValue>({
  headerColor: null,
  setHeaderColor: () => {},
});

export const HeaderColorProvider = ({ children }: PropsWithChildren) => {
  const [headerColor, setHeaderColor] = useState<string | null>(null);

  return (
    <HeaderColorContext.Provider value={{ headerColor, setHeaderColor }}>
      {children}
    </HeaderColorContext.Provider>
  );
};

export const useHeaderColor = () => useContext(HeaderColorContext);
