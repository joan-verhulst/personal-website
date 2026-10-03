"use client";

import { ArrowLeft } from "lucide-react";
import { useAdminPathname } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import Header from "~/modules/cms/components/header";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

// Sits inside the CMS layout, so an unknown or deleted item keeps the sidebar
const CmsNotFound = () => {
  const pathname = useAdminPathname();
  // One level up is the collection the item was in, or the overview
  const parent = pathname.split("/").slice(0, -1).join("/");
  const back = parent.startsWith(`${ADMIN_ROOT}/`) ? parent : ADMIN_ROOT;

  return (
    <Header
      title="Not found"
      description="There's nothing here. It may have been deleted, or the link is wrong."
      actions={
        <Button href={back}>
          <ArrowLeft size={16} aria-hidden />
          Go back
        </Button>
      }
    />
  );
};

export default CmsNotFound;
