import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import {
  LOGIN_PATH,
  NEEDS_CODE_ERROR,
  NEEDS_SETUP_ERROR,
  SETUP_PATH,
  twoFactorState,
  VERIFY_PATH,
} from "~/modules/cms/utils/two-factor";
import { createSessionClient } from "~/modules/supabase/utils/server-client";

/**
 * The signed in admin's client, or why there isn't one. Row level security
 * enforces the same, this just gives a clear message instead of a silent
 * zero-row update.
 *
 * The reason tells a caller what to do about it: "signed-out" needs the
 * login page, "needs-code" the code step, "needs-setup" the page that sets
 * up an authenticator, "not-admin" a row in the admins table, and
 * "unreachable" only another try, because Supabase didn't answer.
 *
 * Checked once per request, however many reads and layouts ask.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSessionClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    // A network error or a 5xx. An expired or missing session isn't one
    if (isAuthRetryableFetchError(userError)) {
      console.error(userError);
      return {
        error: "Couldn't reach Supabase. Try again.",
        user: null,
        reason: "unreachable",
      } as const;
    }
    return {
      error: "You're signed out. Sign in again.",
      user: null,
      reason: "signed-out",
    } as const;
  }

  // A password alone isn't enough. This comes before the admin check: once
  // supabase/migrations/0004_two_factor.sql has been run, is_admin() is false
  // without a code, and that would read as "not an admin"
  const state = await twoFactorState(supabase, user);
  if (state === "needs-code") {
    return { error: NEEDS_CODE_ERROR, user, reason: "needs-code" } as const;
  }
  if (state === "needs-setup") {
    return { error: NEEDS_SETUP_ERROR, user, reason: "needs-setup" } as const;
  }

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError) {
    console.error(rpcError);
    return {
      error: "Couldn't check this account's access. Try again.",
      user,
      reason: "unreachable",
    } as const;
  }
  if (!isAdmin) {
    return {
      error: "This account isn't an admin. Add it to the admins table.",
      user,
      reason: "not-admin",
    } as const;
  }

  return { supabase, user } as const;
});

// Never returns for anyone but the admin: signed out goes to the login page,
// a session without a code to the step it still has to take, and an account
// that isn't an admin gets a 404. Not the login page, which sends signed in
// visitors straight back.
const adminOrLeave = async () => {
  const admin = await requireAdmin();
  if (!admin.error) return admin;

  const { href } = await getAdminPaths();
  if (admin.reason === "signed-out") redirect(href(LOGIN_PATH));
  if (admin.reason === "needs-code") redirect(href(VERIFY_PATH));
  if (admin.reason === "needs-setup") redirect(href(SETUP_PATH));
  if (admin.reason === "not-admin") notFound();
  throw new Error(admin.error);
};

/**
 * The admin's client for reading a CMS screen. The layout checks too, but a
 * request for only the page skips the layout, so every read goes through
 * here. Never returns for anyone else.
 */
export const adminClient = async () => (await adminOrLeave()).supabase;

/** The admin's own account, for a screen about it. Guarded like adminClient. */
export const adminUser = async () => (await adminOrLeave()).user;
