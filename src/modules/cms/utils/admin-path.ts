import { env } from "~/env";

export const ADMIN_ROOT = "/admin";

const ADMIN_HOST = env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase() ?? null;

export const HAS_ADMIN_HOST = ADMIN_HOST !== null;

export const isAdminHost = (host: string | null | undefined) =>
  ADMIN_HOST !== null && host?.toLowerCase() === ADMIN_HOST;

export const isAdminPath = (path: string) =>
  path === ADMIN_ROOT ||
  ["/", "?", "#"].some((next) => path.startsWith(`${ADMIN_ROOT}${next}`));

export const toBrowserPath = (path: string, onAdminHost: boolean) => {
  if (!onAdminHost || !isAdminPath(path)) return path;
  return `/${path.slice(ADMIN_ROOT.length).replace(/^[/\\\s]+/, "")}`;
};

export const isProxiedPath = (path: string) =>
  !/^\/(api|_next)\//.test(path) && !/\.\w+$/.test(path);

export const toCanonicalPath = (path: string, onAdminHost: boolean) => {
  if (!onAdminHost || isAdminPath(path) || !path.startsWith("/")) return path;
  const rest = /^\/(?=$|[?#])/.test(path) ? path.slice(1) : path;
  return `${ADMIN_ROOT}${rest}`;
};

export interface AdminPaths {
  onAdminHost: boolean;
  siteUrl: string;
  href: (path: string) => string;
  canonical: (path: string) => string;
}

export const adminPaths = (
  onAdminHost: boolean,
  siteUrl = onAdminHost ? (env.NEXT_PUBLIC_URL ?? "/") : "/",
): AdminPaths => ({
  onAdminHost,
  siteUrl,
  href: (path) => toBrowserPath(path, onAdminHost),
  canonical: (path) => toCanonicalPath(path, onAdminHost),
});
