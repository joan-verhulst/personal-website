import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { getContent } from "~/modules/content/utils/get-content";
import UiUxWall from "~/modules/ui-ux/components/ui-ux-wall";
import { pageMetadata } from "~/utils/page-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("uiUx", await getContent());

const UiUxPage = () => {
  return (
    <PageWithFooter className="min-h-screen">
      <h1 className="sr-only">UI/UX</h1>
      <UiUxWall />
    </PageWithFooter>
  );
};

export default UiUxPage;
