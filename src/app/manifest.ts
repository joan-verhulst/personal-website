import type { MetadataRoute } from "next";
import { siteData } from "~/data/site";

// The icons are made from the headshot by scripts/make-icons.mts
const manifest = (): MetadataRoute.Manifest => ({
  name: siteData.metadata.title,
  short_name: siteData.owner.name,
  description: siteData.metadata.description,
  start_url: "/",
  display: "browser",
  background_color: "#faf9f9",
  theme_color: "#faf9f9",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
});

export default manifest;
