"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type AdminPaths, adminPaths } from "~/modules/cms/utils/admin-path";

const AdminPathContext = createContext<AdminPaths>(adminPaths(false, "/"));

interface Props {
  /** Whether the request came in on the admin's own host. */
  onAdminHost: boolean;
  /** The public site's home page, as the server knows it. */
  siteUrl: string;
  children: ReactNode;
}

/**
 * Tells the admin's client components which host they're on. The server
 * reads that from the request and passes it down, so the first render in the
 * browser builds the same links the server did.
 */
export const AdminPathProvider = ({
  onAdminHost,
  siteUrl,
  children,
}: Props) => {
  const paths = useMemo(
    () => adminPaths(onAdminHost, siteUrl),
    [onAdminHost, siteUrl],
  );

  return (
    <AdminPathContext.Provider value={paths}>
      {children}
    </AdminPathContext.Provider>
  );
};

/**
 * The admin's paths for this host. Paths in the code are canonical, like
 * "/admin/ui-ux", and href() turns one into what a link or the router needs.
 *
 * @example
 * const { href } = useAdminPath();
 * router.push(href("/admin/security")); // "/security" on the admin host
 */
export const useAdminPath = () => useContext(AdminPathContext);

/**
 * usePathname() in the canonical form: "/admin/ui-ux" on every host, so a
 * comparison with a path from the code holds on the admin host too.
 */
export const useAdminPathname = () => useAdminPath().canonical(usePathname());
