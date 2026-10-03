import { env } from "~/env";

/**
 * Where the admin lives in the app's routes. Every admin path in the code is
 * written from here, like "/admin/ui-ux": the canonical form.
 */
export const ADMIN_ROOT = "/admin";

const ADMIN_HOST = env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase() ?? null;

/** Whether the admin has a host of its own, see NEXT_PUBLIC_ADMIN_HOST. */
export const HAS_ADMIN_HOST = ADMIN_HOST !== null;

/** Whether a request's Host header names the admin's own host. */
export const isAdminHost = (host: string | null | undefined) =>
  ADMIN_HOST !== null && host?.toLowerCase() === ADMIN_HOST;

/** Whether a path is the admin's root or under it, in the canonical form. */
export const isAdminPath = (path: string) =>
  path === ADMIN_ROOT ||
  ["/", "?", "#"].some((next) => path.startsWith(`${ADMIN_ROOT}${next}`));

/**
 * A canonical path as the browser should see it. On the admin host that's
 * without the prefix, anywhere else it's the path itself. A query or hash
 * comes along, and anything that isn't an admin path is left alone.
 *
 * @example
 * toBrowserPath("/admin/ui-ux?tab=experiments", true); // "/ui-ux?tab=experiments"
 * toBrowserPath("/admin", true); // "/"
 * toBrowserPath("/admin/ui-ux", false); // "/admin/ui-ux"
 */
export const toBrowserPath = (path: string, onAdminHost: boolean) => {
  if (!onAdminHost || !isAdminPath(path)) return path;
  // Exactly one slash in front. A browser reads "//other.site" as another
  // site, and takes a backslash for a slash and skips a tab on the way
  return `/${path.slice(ADMIN_ROOT.length).replace(/^[/\\\s]+/, "")}`;
};

/**
 * Whether the proxy handles a path on the admin host, which is what makes it
 * one of the admin's there. The rest is answered as on any host: the route
 * handlers under /api, Next's own files and anything with an extension.
 *
 * This has to say the same as the matcher in src/proxy.ts. Next only reads
 * that one as a literal, so it can't be built from here.
 *
 * @example
 * isProxiedPath("/ui-ux/items"); // true
 * isProxiedPath("/api/on-rotation"); // false
 * isProxiedPath("/icon.png"); // false
 */
export const isProxiedPath = (path: string) =>
  !/^\/(api|_next)\//.test(path) && !/\.\w+$/.test(path);

/**
 * The other way around: a path from the address bar as the code knows it. A
 * path that has the prefix already is left alone, since the admin host never
 * serves one: the proxy redirects it to the address without.
 *
 * @example
 * toCanonicalPath("/ui-ux", true); // "/admin/ui-ux"
 * toCanonicalPath("/", true); // "/admin"
 */
export const toCanonicalPath = (path: string, onAdminHost: boolean) => {
  if (!onAdminHost || isAdminPath(path) || !path.startsWith("/")) return path;
  // "/", "/?tab=x" and "/#top" are the root, which has no slash of its own
  const rest = /^\/(?=$|[?#])/.test(path) ? path.slice(1) : path;
  return `${ADMIN_ROOT}${rest}`;
};

export interface AdminPaths {
  /** Whether this request came in on the admin's own host. */
  onAdminHost: boolean;
  /**
   * The public site's home page. A full address on the admin host, where "/"
   * is the dashboard.
   */
  siteUrl: string;
  /** A canonical path as a link or redirect on this host has to spell it. */
  href: (path: string) => string;
  /** A path from the address bar, in the canonical form. */
  canonical: (path: string) => string;
}

/**
 * The admin's paths for one host. Server code gets it from getAdminPaths(),
 * client code from useAdminPath(), and the proxy makes its own.
 *
 * The site's address is read from the environment unless it's passed in. The
 * browser can't see the server's fallbacks for it, so the admin layout
 * passes on what the server found.
 */
export const adminPaths = (
  onAdminHost: boolean,
  siteUrl = onAdminHost ? (env.NEXT_PUBLIC_URL ?? "/") : "/",
): AdminPaths => ({
  onAdminHost,
  siteUrl,
  href: (path) => toBrowserPath(path, onAdminHost),
  canonical: (path) => toCanonicalPath(path, onAdminHost),
});
