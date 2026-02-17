import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import type { PropsWithChildren } from "react";

import "~styles/global.css";

import { env } from "~/env";
import { siteData } from "~/data/site";

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
  openGraph: {
    url: new URL(env.NEXT_PUBLIC_URL as string),
    title: `${siteData.metadata.title} - ${siteData.metadata.description}`,
    siteName: siteData.metadata.title,
    locale: siteData.metadata.locale,
  },
};

export default RootLayout;
