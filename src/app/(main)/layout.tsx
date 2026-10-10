import { EyesNextProvider } from "eyes-next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppLayer from "~components/layout/app-layer";
import Island from "~components/layout/island/island";
import SettingsFab from "~components/settings-fab";
import SoundToast from "~components/sound-toast";
import { env } from "~/env";
import ContactHost from "~/modules/contact/components/contact-host";
import ContentProvider from "~/modules/content/components/content-provider";
import { getContent } from "~/modules/content/utils/get-content";
import { AnimationPreferenceProvider } from "~/modules/core/context/animation-preference-context";
import { HeaderColorProvider } from "~/modules/core/context/header-color-context";
import SlideWarmer from "~/modules/digital-art/components/slide-warmer";
import { FIRST_SLIDES } from "~/modules/digital-art/utils/slide-image";
import { pageMetadata } from "~/utils/page-metadata";
import { structuredData, toJsonLd } from "~/utils/structured-data";

interface Props {
  children: ReactNode;
  // The section that's open over the home screen, see @app
  app: ReactNode;
}

// The home page is a client component, so its metadata lives here. The
// sections set their own over it
export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("home", await getContent());

const MainLayout = async ({ children, app }: Props) => {
  // From Supabase, cached until the CMS saves something
  const content = await getContent();
  const siteUrl = new URL(env.NEXT_PUBLIC_URL as string).origin;

  return (
    // Analytics for the public site only, so visits to the CMS stay out of
    // the numbers. The script and events go through /api/eyes, see
    // next.config.ts
    <EyesNextProvider siteId="330264404">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON with "<" escaped, see toJsonLd
        dangerouslySetInnerHTML={{
          __html: toJsonLd(structuredData(content, siteUrl)),
        }}
      />
      <ContentProvider content={content}>
        <AnimationPreferenceProvider>
          <HeaderColorProvider>
            <Island />
            <AppLayer slot={app}>{children}</AppLayer>
            <SlideWarmer artworks={content.artworks.slice(0, FIRST_SLIDES)} />
            {/* One contact modal for every page, see openContact */}
            <ContactHost />

            {/* Global settings controls — fixed bottom-right */}
            <div className="pointer-events-none fixed right-8 bottom-8 z-50 flex flex-col items-end gap-2">
              <SoundToast />
              <SettingsFab />
            </div>
          </HeaderColorProvider>
        </AnimationPreferenceProvider>
      </ContentProvider>
    </EyesNextProvider>
  );
};

export default MainLayout;
