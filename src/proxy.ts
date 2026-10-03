import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  ADMIN_ROOT,
  HAS_ADMIN_HOST,
  isAdminHost,
  toBrowserPath,
  toCanonicalPath,
} from "~/modules/cms/utils/admin-path";
import {
  safeRedirectPath,
  withRedirectTo,
} from "~/modules/cms/utils/redirect-to";
import {
  LOGIN_PATH,
  SIGN_IN_PATHS,
  twoFactorState,
  twoFactorStep,
} from "~/modules/cms/utils/two-factor";

/**
 * Decides where the CMS is served, then guards it.
 *
 * With NEXT_PUBLIC_ADMIN_HOST set, that host is the admin and nothing else:
 * its addresses have no /admin in them and are rewritten to the routes under
 * /admin. On every other host /admin is a 404 in production, so the public
 * domain doesn't show there's an admin at all. Local development and preview
 * deployments have no such host, so there /admin keeps working by path.
 * Without the variable, /admin works by path everywhere.
 *
 * The guard refreshes the Supabase session on every admin request and walks
 * a visitor through signing in. Without a session that's the login page,
 * with only a password the code step, and for an account without an
 * authenticator the setup page. Whether a signed in user may change anything
 * is up to the database, see supabase/migrations.
 *
 * It only knows that someone is signed in with a code, not that they're an
 * admin, and it lets action POSTs through. So it's never the only guard:
 * actions call requireAdmin, screens read through adminClient, and a route
 * handler added under /admin has to check for itself too.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const host = request.headers.get("host");
  const onAdminHost = isAdminHost(host);
  const hasPrefix =
    pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);

  // Redirects name the host the visitor asked for. request.url can name the
  // server's own instead, like localhost behind a local admin host
  const urlOf = (path: string) =>
    new URL(
      path,
      `${request.nextUrl.protocol}//${host ?? request.nextUrl.host}`,
    );

  if (onAdminHost) {
    // The admin host has no use for the prefix: one address per page
    if (hasPrefix) {
      return NextResponse.redirect(
        urlOf(toBrowserPath(pathname, true) + search),
      );
    }
  } else {
    // A page can also be asked for as data, like "/admin.rsc", so a dot
    // after the prefix is the admin's as much as a slash is
    const underAdmin = hasPrefix || pathname.startsWith(`${ADMIN_ROOT}.`);

    // The public site. This runs for each of its pages, so it stops before
    // anything that costs time
    if (!underAdmin) return NextResponse.next();

    // The admin has its own host, and this isn't it. Next answers a path
    // without a page with the site's 404
    if (HAS_ADMIN_HOST && process.env.VERCEL_ENV === "production") {
      return NextResponse.rewrite(new URL("/404", request.url));
    }

    // Only pages are guarded below. The rest is Next's to answer
    if (!hasPrefix) return NextResponse.next();
  }

  // The route that renders this page. On the admin host that's the address
  // with the prefix put back
  const page = toCanonicalPath(pathname, onAdminHost);
  const route = request.nextUrl.clone();
  route.pathname = page;
  const pass = () =>
    onAdminHost
      ? NextResponse.rewrite(route, { request })
      : NextResponse.next({ request });

  let response = pass();
  let sessionHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = pass();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          sessionHeaders = headers;
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server actions check the session themselves and return a message. A
  // redirect would reach them as "An unexpected response was received from
  // the server" instead. Only a POST is an action: the header alone on a GET
  // would otherwise let a page request skip the redirect below
  if (request.method === "POST" && request.headers.has("next-action")) {
    return response;
  }

  // A refreshed session only lives in the cookies set above, so a redirect
  // has to carry them or the visitor is signed out on the next request
  const redirect = (path: string) => {
    const redirectResponse = NextResponse.redirect(urlOf(path));
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    for (const [key, value] of Object.entries(sessionHeaders)) {
      redirectResponse.headers.set(key, value);
    }
    return redirectResponse;
  };

  const isSignInPage = SIGN_IN_PATHS.includes(page);
  // Where the visitor was going: this page, or what a sign in page was told.
  // Both are as the address bar has them, and come back canonical
  const target = safeRedirectPath(
    isSignInPage ? searchParams.get("redirectTo") : pathname + search,
    onAdminHost,
  );

  // Each state has one sign in page it may be on. Sending every other page
  // there, and never that page itself, is what keeps this from looping
  const stay = (path: string) =>
    page === path
      ? response
      : redirect(withRedirectTo(path, target, onAdminHost));

  if (!user) return stay(LOGIN_PATH);

  const step = twoFactorStep(await twoFactorState(supabase, user));
  if (step) return stay(step);

  // Signed in with a code: nothing left to do on the sign in pages
  return isSignInPage
    ? redirect(toBrowserPath(target ?? ADMIN_ROOT, onAdminHost))
    : response;
}

export const config = {
  matcher: [
    // Everything under /admin, whatever it's called. That includes a page
    // asked for as data, like "/admin.rsc", which the last line would skip
    "/admin:rest([/.].*)?",
    // The admin host serves the CMS from its root, so every page passes
    // through here. Not what Next serves by itself, a file with an extension
    // (images, fonts, icons, the manifest) or a route handler under /api.
    // isProxiedPath in utils/admin-path.ts has to say the same
    "/",
    "/((?!api/|_next/|.*\\.\\w+$).*)",
  ],
};
