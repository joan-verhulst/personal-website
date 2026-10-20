import {
  ADMIN_ROOT,
  isProxiedPath,
  toBrowserPath,
  toCanonicalPath,
} from "~/modules/cms/utils/admin-path";
import { SIGN_IN_PATHS } from "~/modules/cms/utils/two-factor";

const ORIGIN = "http://cms.local";

export const safeRedirectPath = (value: unknown, onAdminHost: boolean) => {
  if (typeof value !== "string" || !value.startsWith("/")) return null;

  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return null;
  }

  const { origin, search, hash } = url;
  if (origin !== ORIGIN || url.pathname.includes("//")) return null;

  const pathname = toCanonicalPath(url.pathname, onAdminHost);
  const isAdminPage =
    pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);
  if (!isAdminPage || SIGN_IN_PATHS.includes(pathname)) return null;

  if (onAdminHost && !isProxiedPath(toBrowserPath(pathname, true))) {
    return null;
  }

  return `${pathname}${search}${hash}`;
};

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
