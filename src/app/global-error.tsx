"use client";

import { Google_Sans_Flex } from "next/font/google";

import "~styles/global.css";

const GoogleSansFlexFont = Google_Sans_Flex({
  subsets: ["latin"],
});

const GlobalError = () => (
  <html className={GoogleSansFlexFont.className} lang="en">
    <body>
      <title>Back in a moment</title>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-medium text-2xl text-neutral-950">
          Back in a moment
        </h1>
        <p className="max-w-sm text-neutral-600 text-sm">
          The site couldn't load just now. It usually sorts itself out within
          a minute.
        </p>
        <button
          type="button"
          className="mt-3 cursor-pointer rounded-full bg-neutral-950 px-5 py-2.5 font-medium text-sm text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    </body>
  </html>
);

export default GlobalError;
