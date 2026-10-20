import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import type { PropsWithChildren } from "react";

import "~styles/global.css";

import { Tencil } from "tencil/react";
import { siteData } from "~/data/site";
import { env } from "~/env";
import { openGraph } from "~/utils/page-metadata";

const GoogleSansFlexFont = Google_Sans_Flex({
  subsets: ["latin"],
});

// Runs before the first paint: when the home intro is about to play, it marks
// the page so the widgets start hidden instead of showing in place and then
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
      <body>{children}<Tencil /></body>
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
