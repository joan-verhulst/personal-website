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

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const host = request.headers.get("host");
  const onAdminHost = isAdminHost(host);
  const hasPrefix =
    pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);

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

    if (!underAdmin) return NextResponse.next();

    // The admin has its own host, and this isn't it. Next answers a path
    // without a page with the site's 404
    if (HAS_ADMIN_HOST && process.env.VERCEL_ENV === "production") {
      return NextResponse.rewrite(new URL("/404", request.url));
    }

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
  // redirect would reach them as "An unexpected response was received from the server."
  if (request.method === "POST" && request.headers.has("next-action")) {
    return response;
  }

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

  return isSignInPage
    ? redirect(toBrowserPath(target ?? ADMIN_ROOT, onAdminHost))
    : response;
}

export const config = {
  matcher: [
    "/admin:rest([/.].*)?",
    { source: "/", has: [{ type: "host", value: "admin\\..+" }] },
    {
      source: "/((?!api/|_next/|.*\\.\\w+$).*)",
      has: [{ type: "host", value: "admin\\..+" }],
    },
  ],
};
