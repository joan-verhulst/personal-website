import type { Metadata } from "next";
import { GalleryPage } from "~/modules/cms/components/gallery/gallery-pages";

export const metadata: Metadata = { title: "Photography" };

const PhotographyAdmin = () => <GalleryPage kind="photos" />;

export default PhotographyAdmin;
