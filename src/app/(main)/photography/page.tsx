import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { getContent } from "~/modules/content/utils/get-content";
import PhotoTable from "~/modules/photography/components/photo-table";
import { pageMetadata } from "~/utils/page-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("photography", await getContent());

const PhotographyPage = async () => {
  // Size and color are measured when a photo is uploaded
  const { photos } = await getContent();

  return (
    <PageWithFooter className="min-h-screen">
      {/* The island names the section on screen, this names it for search */}
      <h1 className="sr-only">Photography</h1>
      <PhotoTable prints={photos} />
    </PageWithFooter>
  );
};

export default PhotographyPage;
