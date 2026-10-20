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

export const requireAdmin = cache(async () => {
  const supabase = await createSessionClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
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

// Non-admins get a 404, not the login page, which sends signed in visitors back
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

export const adminClient = async () => (await adminOrLeave()).supabase;

export const adminUser = async () => (await adminOrLeave()).user;
