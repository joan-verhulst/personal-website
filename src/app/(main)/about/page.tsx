import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { ownPages } from "~/data/pages";
import AboutPage from "~/modules/about/components/about-page";
import { describedPageMetadata } from "~/utils/page-metadata";

export const metadata: Metadata = describedPageMetadata(ownPages.about);

const About = () => {
  return (
    <PageWithFooter className="min-h-screen">
      <AboutPage />
    </PageWithFooter>
  );
};

export default About;
