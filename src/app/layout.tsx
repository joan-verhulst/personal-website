import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import type { PropsWithChildren } from "react";

import "~styles/global.css";

import { env } from "~/env";
import { siteData } from "~/data/site";
import { openGraph } from "~/utils/page-metadata";

const GoogleSansFlexFont = Google_Sans_Flex({
  subsets: ["latin"],
});

// Runs before the first paint: when the home intro is about to play, it marks
// the page so the widgets start hidden instead of showing in place and then
// jumping into the animation. The home page plays it and clears the mark. If
// the page never gets to it, the mark goes after a while and the widgets just
// show, without an intro
const INTRO_SCRIPT = `try{var d=document.documentElement;if(location.pathname==="/"&&sessionStorage.getItem("has-seen-intro")!=="true"&&localStorage.getItem("animations-enabled")!=="false"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.intro="pending";setTimeout(function(){if(d.dataset.intro==="pending")delete d.dataset.intro},6000)}}catch(e){}`;

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    // The intro script may set data-intro before React takes over
    <html
      className={GoogleSansFlexFont.className}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string, it has to run before the page paints */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_URL as string),
  title: {
    template: siteData.metadata.titleTemplate,
    default: siteData.metadata.title,
  },
  description: siteData.metadata.description,
  // The image is the home screen, see (main)/opengraph-image.tsx
  openGraph: {
    ...openGraph,
    title: siteData.metadata.title,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default RootLayout;
