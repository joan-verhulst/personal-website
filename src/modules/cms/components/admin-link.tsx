"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAdminPath } from "~/modules/cms/components/admin-path";

const AdminLink = ({ href, ...props }: ComponentProps<typeof Link>) => {
  const paths = useAdminPath();

  return (
    <Link href={typeof href === "string" ? paths.href(href) : href} {...props} />
  );
};

export default AdminLink;
