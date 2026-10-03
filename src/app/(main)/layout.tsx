import type { ReactNode } from "react";
import AppLayer from "~components/layout/app-layer";
import Island from "~components/layout/island/island";
import SettingsFab from "~components/settings-fab";
import SoundToast from "~components/sound-toast";
import ContentProvider from "~/modules/content/components/content-provider";
import { getContent } from "~/modules/content/utils/get-content";
import { AnimationPreferenceProvider } from "~/modules/core/context/animation-preference-context";
import { HeaderColorProvider } from "~/modules/core/context/header-color-context";
import SlideWarmer from "~/modules/digital-art/components/slide-warmer";
import { FIRST_SLIDES } from "~/modules/digital-art/utils/slide-image";

interface Props {
  children: ReactNode;
  // The section that's open over the home screen, see @app
  app: ReactNode;
}

const MainLayout = async ({ children, app }: Props) => {
  // From Supabase, cached until the CMS saves something
  const content = await getContent();

  return (
    <ContentProvider content={content}>
      <AnimationPreferenceProvider>
        <HeaderColorProvider>
          <Island />
          <AppLayer slot={app}>{children}</AppLayer>
          <SlideWarmer artworks={content.artworks.slice(0, FIRST_SLIDES)} />

          {/* Global settings controls — fixed bottom-right */}
          <div className="pointer-events-none fixed right-8 bottom-8 z-50 flex flex-col items-end gap-2">
            <SoundToast />
            <SettingsFab />
          </div>
        </HeaderColorProvider>
      </AnimationPreferenceProvider>
    </ContentProvider>
  );
};

export default MainLayout;
