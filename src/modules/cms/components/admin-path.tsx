"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type AdminPaths, adminPaths } from "~/modules/cms/utils/admin-path";

const AdminPathContext = createContext<AdminPaths>(adminPaths(false, "/"));

interface Props {
  onAdminHost: boolean;
  siteUrl: string;
  children: ReactNode;
}

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

export const useAdminPath = () => useContext(AdminPathContext);

export const useAdminPathname = () => useAdminPath().canonical(usePathname());
