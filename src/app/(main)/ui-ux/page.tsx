import type { Metadata } from "next";
import UiUxWall from "~/modules/ui-ux/components/ui-ux-wall";

export const metadata: Metadata = {
  title: "UI/UX",
};

const UiUxPage = () => {
  return (
    <main className="min-h-screen bg-neutral-50">
      <UiUxWall />
    </main>
  );
};

export default UiUxPage;
