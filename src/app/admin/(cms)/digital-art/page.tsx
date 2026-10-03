import type { Metadata } from "next";
import { GalleryPage } from "~/modules/cms/components/gallery/gallery-pages";

export const metadata: Metadata = { title: "Digital art" };

const DigitalArtAdmin = () => <GalleryPage kind="artworks" />;

export default DigitalArtAdmin;
