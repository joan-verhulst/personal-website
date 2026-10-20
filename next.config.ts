import { withEyes } from "eyes-next/config";
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["personal-design-system"],
  images: {
    qualities: [75, 90],
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_URL
      ? [
          new URL(
            `${process.env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/**`,
          ),
        ]
      : [],
  },
};

export default withEyes(config);
