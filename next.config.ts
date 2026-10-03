import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    // 90 keeps text in UI screenshots sharp
    qualities: [75, 90],
    // Media from the CMS lives in the Supabase storage bucket
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          new URL(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/**`,
          ),
        ]
      : [],
  },
};

export default config;
