import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AdminPathProvider } from "~/modules/cms/components/admin-path";
import { ConfirmProvider } from "~/modules/cms/components/confirm";
import { TooltipProvider } from "~/modules/cms/components/primitives/tooltip";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { cmsFont } from "~/modules/cms/utils/font";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Wraps the sign in page and the CMS. Admin-only styles hang off data-cms,
 * so nothing here reaches the public site.
 *
 * It also tells the client components which host the admin is on, so their
 * links match the ones rendered here, see utils/admin-path.ts.
 */
const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const { onAdminHost, siteUrl } = await getAdminPaths();

  return (
    <AdminPathProvider onAdminHost={onAdminHost} siteUrl={siteUrl}>
      <div
        data-cms
        // dvh, like the screens inside it: on a phone 100vh is taller than
        // what's visible while the address bar shows, which would let the
        // page scroll
        className={`${cmsFont.className} min-h-dvh bg-neutral-50 text-base text-neutral-950`}
      >
        <TooltipProvider delayDuration={300}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </TooltipProvider>
        {/* Sonner sets its own system font, so each toast takes Inter back.
            On a phone toasts span the bottom of the screen, so there they
            sit above the bar that holds Save and Delete */}
        <Toaster
          position="bottom-right"
          mobileOffset={{ bottom: 88 }}
          toastOptions={{ className: cmsFont.className }}
        />
      </div>
    </AdminPathProvider>
  );
};

export default AdminLayout;
