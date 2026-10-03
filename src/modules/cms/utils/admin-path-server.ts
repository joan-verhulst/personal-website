import { headers } from "next/headers";
import { cache } from "react";
import { adminPaths, isAdminHost } from "~/modules/cms/utils/admin-path";

/**
 * The admin's paths for the host this request came in on, for layouts, pages
 * and server actions. Read once per request.
 *
 * @example
 * const { href } = await getAdminPaths();
 * redirect(href(LOGIN_PATH)); // "/login" on the admin host, "/admin/login" elsewhere
 */
export const getAdminPaths = cache(async () =>
  adminPaths(isAdminHost((await headers()).get("host"))),
);
