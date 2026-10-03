import type { Metadata } from "next";
import { getContent } from "~/modules/content/utils/get-content";
import DigitalArtGallery from "~/modules/digital-art/components/digital-art-gallery";

export const metadata: Metadata = {
  title: "Digital Art",
};

const DigitalArtPage = async () => {
  // Sizes are measured when a piece is uploaded
  const { artworks } = await getContent();

  return <DigitalArtGallery artworks={artworks} />;
};

export default DigitalArtPage;
