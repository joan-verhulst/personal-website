import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { getContent } from "~/modules/content/utils/get-content";
import PhotoTable from "~/modules/photography/components/photo-table";
import { pageMetadata } from "~/utils/page-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("photography", await getContent());

const PhotographyPage = async () => {
  const { photos } = await getContent();

  return (
    <PageWithFooter className="min-h-screen">
      <h1 className="sr-only">Photography</h1>
      <PhotoTable prints={photos} />
    </PageWithFooter>
  );
};

export default PhotographyPage;
