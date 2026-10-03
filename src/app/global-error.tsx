"use client";

import { Google_Sans_Flex } from "next/font/google";

import "~styles/global.css";

const GoogleSansFlexFont = Google_Sans_Flex({
  subsets: ["latin"],
});

/**
 * What a visitor gets when a page can't be built, like when the content
 * couldn't be read right after a save in the CMS. It heals on a later
 * request, so all this does is say so and offer a reload.
 *
 * It takes the place of the root layout, so it brings its own html, styles
 * and font. It's also built ahead of time as the site's 500 page, which is
 * why it reads no content and doesn't look at the error it's handed.
 */
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
