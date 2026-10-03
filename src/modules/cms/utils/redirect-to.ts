import {
  ADMIN_ROOT,
  isProxiedPath,
  toBrowserPath,
  toCanonicalPath,
} from "~/modules/cms/utils/admin-path";
import { SIGN_IN_PATHS } from "~/modules/cms/utils/two-factor";

const ORIGIN = "http://cms.local";

/**
 * The CMS page to go back to after signing in, in the canonical form, or
 * null when the value isn't one. The value comes from the address, so it's
 * in the browser's form: "/ui-ux" on the admin host, "/admin/ui-ux"
 * elsewhere.
 *
 * Only pages of the admin on this site pass, so the login page can't be used
 * to send someone to another site. The sign in pages themselves don't pass
 * either: they're steps on the way, not somewhere to end up.
 *
 * @example
 * safeRedirectPath("/ui-ux?tab=experiments", true); // "/admin/ui-ux?tab=experiments"
 * safeRedirectPath("/login", true); // null
 * safeRedirectPath("//other.site", true); // null
 * safeRedirectPath("/admin//other.site", true); // null
 * safeRedirectPath("/api/on-rotation", true); // null
 */
export const safeRedirectPath = (value: unknown, onAdminHost: boolean) => {
  if (typeof value !== "string" || !value.startsWith("/")) return null;

  let url: URL;
  try {
    // Resolving against a fixed origin catches "//other.site" and "/\other.site"
    url = new URL(value, ORIGIN);
  } catch {
    return null;
  }

  const { origin, search, hash } = url;
  // An empty segment has no page, and without the prefix "/admin//other.site"
  // would be another site's address. Checked on the parsed path, which has
  // "/x/../", a tab or a backslash worked out already
  if (origin !== ORIGIN || url.pathname.includes("//")) return null;

  const pathname = toCanonicalPath(url.pathname, onAdminHost);
  const isAdminPage =
    pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);
  if (!isAdminPage || SIGN_IN_PATHS.includes(pathname)) return null;

  // On the admin host a path is only the admin's when the proxy handles it.
  // "/api/on-rotation" or "/icon.png" would end up outside the CMS
  if (onAdminHost && !isProxiedPath(toBrowserPath(pathname, true))) {
    return null;
  }

  return `${pathname}${search}${hash}`;
};

/**
 * The address of a sign in page that remembers where the visitor was going.
 * Both paths go in canonical, and what comes out is ready for this host's
 * address bar. The dashboard is where signing in ends anyway, so it's left
 * out.
 *
 * @example
 * withRedirectTo(VERIFY_PATH, "/admin/photography", false);
 * // "/admin/login/verify?redirectTo=%2Fadmin%2Fphotography"
 * withRedirectTo(VERIFY_PATH, "/admin/photography", true);
 * // "/login/verify?redirectTo=%2Fphotography"
 */
export const withRedirectTo = (
  path: string,
  redirectTo: string | null,
  onAdminHost: boolean,
) => {
  const step = toBrowserPath(path, onAdminHost);
  return redirectTo && redirectTo !== ADMIN_ROOT
    ? `${step}?redirectTo=${encodeURIComponent(toBrowserPath(redirectTo, onAdminHost))}`
    : step;
};
