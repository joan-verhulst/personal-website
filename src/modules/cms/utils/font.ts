import { Inter } from "next/font/google";

// The admin is set in Inter, like the Spark dashboards it borrows from. It's
// only loaded on admin pages, the site keeps its own font. Popovers render in
// a portal outside the admin wrapper, so they add this class themselves
export const cmsFont = Inter({
  subsets: ["latin"],
  weight: "variable",
});
