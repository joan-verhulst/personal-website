"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAdminPath } from "~/modules/cms/components/admin-path";

/**
 * next/link for a page of the admin. It takes the path as the code knows it,
 * "/admin/ui-ux", and links to what this host calls it. Anything else, like
 * "#top" or another site, is left as it is.
 *
 * @example
 * <AdminLink href="/admin/ui-ux/items">Items</AdminLink>
 */
const AdminLink = ({ href, ...props }: ComponentProps<typeof Link>) => {
  const paths = useAdminPath();

  return (
    <Link href={typeof href === "string" ? paths.href(href) : href} {...props} />
  );
};

export default AdminLink;
