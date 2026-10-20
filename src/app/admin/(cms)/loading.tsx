"use client";

import { useAdminPathname } from "~/modules/cms/components/admin-path";
import PageLoading from "~/modules/cms/components/page-loading";

const FORM_PAGES = ["/admin/about", "/admin/contact"];

const CmsLoading = () => {
  const pathname = useAdminPathname();

  if (FORM_PAGES.includes(pathname)) {
    return <PageLoading width="form" actions="save" />;
  }
  if (pathname === "/admin/ui-ux") return <PageLoading actions="save" />;
  if (pathname === "/admin/ui-ux/tags") return <PageLoading sections={1} />;
  if (pathname === "/admin/security") {
    return <PageLoading width="form" sections={2} />;
  }

  return <PageLoading />;
};

export default CmsLoading;
