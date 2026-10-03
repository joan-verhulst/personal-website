"use client";

import { useAdminPathname } from "~/modules/cms/components/admin-path";
import PageLoading from "~/modules/cms/components/page-loading";

// The pages that are one form, 720px wide, with Save in the bottom bar
const FORM_PAGES = ["/admin/about", "/admin/contact"];

/**
 * Covers every page without a loading state of its own: the dashboard, the
 * wall, the tags, About, Contact and Security. The collections have theirs,
 * with cards.
 */
const CmsLoading = () => {
  // Canonical, so these match on the admin host too
  const pathname = useAdminPathname();

  if (FORM_PAGES.includes(pathname)) {
    return <PageLoading width="form" actions="save" />;
  }
  // The wall saves from the bar too, which keeps the + from showing first
  if (pathname === "/admin/ui-ux") return <PageLoading actions="save" />;
  if (pathname === "/admin/ui-ux/tags") return <PageLoading sections={1} />;
  // Two sections and nothing to save
  if (pathname === "/admin/security") {
    return <PageLoading width="form" sections={2} />;
  }

  return <PageLoading />;
};

export default CmsLoading;
