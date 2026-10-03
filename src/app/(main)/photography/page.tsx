import type { Metadata } from "next";
import { getContent } from "~/modules/content/utils/get-content";
import PhotoTable from "~/modules/photography/components/photo-table";

export const metadata: Metadata = {
  title: "Photography",
};

const PhotographyPage = async () => {
  // Size and color are measured when a photo is uploaded
  const { photos } = await getContent();

  return (
    <main className="min-h-screen bg-neutral-50">
      <PhotoTable prints={photos} />
    </main>
  );
};

export default PhotographyPage;
