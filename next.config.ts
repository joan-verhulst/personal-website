import { withEyes } from "eyes-next/config";
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    // 90 keeps text in UI screenshots sharp
    qualities: [75, 90],
    // Media from the CMS lives in the media bucket on R2, on its own domain
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_URL
      ? [
          new URL(
            `${process.env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/**`,
          ),
        ]
      : [],
  },
};

// Serves the Eyes analytics script and its events from /api/eyes on the
// site's own host, so ad blockers leave them alone
export default withEyes(config);
