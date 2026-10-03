import type { Metadata } from "next";
import UiUxWall from "~/modules/ui-ux/components/ui-ux-wall";
import { sectionMetadata } from "~/utils/page-metadata";

export const metadata: Metadata = sectionMetadata("UI/UX", "/ui-ux");

const UiUxPage = () => {
  return (
    <main className="min-h-screen bg-neutral-50">
      <UiUxWall />
    </main>
  );
};

export default UiUxPage;
