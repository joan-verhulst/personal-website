"use client";

import { EyesNextProvider } from "eyes-next";
import type { ReactNode } from "react";

const dropLocally = process.env.NODE_ENV === "development" ? () => null : undefined;

const Analytics = ({ children }: { children: ReactNode }) => (
  <EyesNextProvider siteId="330264404" beforeSend={dropLocally}>
    {children}
  </EyesNextProvider>
);

export default Analytics;
