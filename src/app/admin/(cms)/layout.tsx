import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import Header from "~/modules/cms/components/header";
import BottomNav from "~/modules/cms/components/shell/bottom-nav";
import { PageActionsProvider } from "~/modules/cms/components/shell/page-actions";
import TopBar from "~/modules/cms/components/shell/top-bar";
import MobileSidebar from "~/modules/cms/components/sidebar/mobile-sidebar";
import Sidebar from "~/modules/cms/components/sidebar/sidebar";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  LOGIN_PATH,
  SETUP_PATH,
  VERIFY_PATH,
} from "~/modules/cms/utils/two-factor";

export const metadata: Metadata = {
  // Every page names itself, so tabs and history tell Items from About
  title: { template: "%s · Content", default: "Content" },
  robots: { index: false, follow: false },
};

/**
 * The grey screen with the sidebar and the white panel that holds a page. The
 * screen itself never scrolls: only the page inside the panel does, between
 * the breadcrumbs and the bottom bar. So the bar stays in reach on a phone
 * too, and a page scrolls exactly as far as its content goes.
 *
 * A page is 960px wide at most, which suits a collection. A form page wraps
 * itself in <Page width="form"> to go down to 720px. What a page renders
 * stacks 16px apart.
 */
const CmsLayout = async ({ children }: { children: ReactNode }) => {
  const admin = await requireAdmin();
  const { href } = await getAdminPaths();

  if (admin.reason === "signed-out") redirect(href(LOGIN_PATH));
  // Signed in with only a password: the code comes first, or setting up an
  // authenticator for an account that has none
  if (admin.reason === "needs-code") redirect(href(VERIFY_PATH));
  if (admin.reason === "needs-setup") redirect(href(SETUP_PATH));

  // Supabase didn't answer, which says nothing about this account. Neither
  // the login page nor the "not an admin" steps below would help
  if (admin.reason === "unreachable") {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-2 bg-neutral-100 px-6 text-center">
        <h1 className="font-medium text-neutral-950 text-sm">
          Couldn't reach Supabase
        </h1>
        <p className="text-neutral-600 text-xs">
          Reload the page to try again.
        </p>
      </main>
    );
  }

  return (
    <PageActionsProvider>
      {/* Past the sidebar's links, for whoever gets around with Tab. It
          waits above the screen until it has focus */}
      <a
        href="#cms-main"
        className="fixed top-2 left-2 z-50 -translate-y-[200%] rounded-[10px] bg-white px-3 py-2 font-medium text-neutral-950 text-xs shadow-lg focus:translate-y-0 focus:outline-2 focus:outline-primary-500"
      >
        Skip to content
      </a>
      <div className="flex h-dvh flex-col overflow-hidden bg-neutral-100 md:flex-row">
        <Sidebar email={admin.user.email ?? ""} />
        <MobileSidebar email={admin.user.email ?? ""} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-t-xl border border-neutral-950/10 bg-white md:mt-2 md:rounded-tr-none">
          {/* Both bars read the address's query, which needs a boundary */}
          <Suspense fallback={<div className="h-[54px] shrink-0" />}>
            <TopBar />
          </Suspense>
          <main
            id="cms-main"
            // Focusable from the skip link only
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-hidden"
          >
            {/* The bar below takes its own room, so the page only needs a
                normal padding under its content */}
            <div className="px-4 pt-8 pb-8 md:px-8 md:pt-10 md:pb-10">
              <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
                {admin.error ? (
                  <>
                    <Header
                      title="Not an admin yet"
                      description="You're signed in, but this account can't change content."
                    />
                    <div className="rounded-2xl border border-warning-200 bg-warning-50 p-5">
                      <p className="flex items-center gap-2 font-medium text-sm text-warning-800">
                        <TriangleAlert size={16} aria-hidden />
                        Add this account to the admins table
                      </p>
                      <p className="mt-2 text-neutral-700 text-xs">
                        In the Supabase SQL editor, run:
                      </p>
                      <pre className="mt-3 overflow-x-auto rounded-xl border border-warning-200 bg-white p-3 text-xs">
                        {`insert into public.admins (user_id)\nvalues ('${admin.user.id}');`}
                      </pre>
                    </div>
                  </>
                ) : (
                  children
                )}
              </div>
            </div>
          </main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </div>
      </div>
    </PageActionsProvider>
  );
};

export default CmsLayout;
