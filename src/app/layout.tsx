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

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    <html className={GoogleSansFlexFont.className} lang="en">
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
