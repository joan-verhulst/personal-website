import { headers } from "next/headers";
import { cache } from "react";
import { adminPaths, isAdminHost } from "~/modules/cms/utils/admin-path";

export const getAdminPaths = cache(async () =>
  adminPaths(isAdminHost((await headers()).get("host"))),
);
