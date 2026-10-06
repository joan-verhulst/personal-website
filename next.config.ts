import { withEyes } from "eyes-next/config";
import type { NextConfig } from "next";
import { IMAGE_WIDTHS } from "./src/modules/media/utils/media-types";

const config: NextConfig = {
  images: {
    // 90 keeps text in UI screenshots sharp
    qualities: [75, 90],
    // The widths a page offers the browser. They're the widths media is
    // stored at on R2, so every one of them exists, see mediaImageProps
    deviceSizes: [...IMAGE_WIDTHS],
    // Media from the CMS is never resized here: it loads straight from R2 in
    // the size that fits. So its domain isn't listed, and an <Image> that
    // would have Vercel resize it fails in development instead of quietly
    // costing Vercel's limits
    remotePatterns: [],
  },
};

// Serves the Eyes analytics script and its events from /api/eyes on the
// site's own host, so ad blockers leave them alone
export default withEyes(config);
