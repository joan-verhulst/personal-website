import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { getContent } from "~/modules/content/utils/get-content";
import UiUxWall from "~/modules/ui-ux/components/ui-ux-wall";
import { pageMetadata } from "~/utils/page-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("uiUx", await getContent());

// The footer is under the wall, uncovered as the wall scrolls away
const UiUxPage = () => {
  return (
    <PageWithFooter className="min-h-screen">
      {/* The island names the section on screen, this names it for search */}
      <h1 className="sr-only">UI/UX</h1>
      <UiUxWall />
    </PageWithFooter>
  );
};

export default UiUxPage;
