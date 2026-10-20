import { Inter } from "next/font/google";

// Popovers render in a portal outside the admin wrapper, so they add this class themselves
export const cmsFont = Inter({
  subsets: ["latin"],
  weight: "variable",
});
