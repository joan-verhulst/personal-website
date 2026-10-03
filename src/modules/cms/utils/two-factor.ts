import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

// Canonical paths, like every admin path in the code. A link or redirect
// spells them for the host it's on, see utils/admin-path.ts
export const LOGIN_PATH = `${ADMIN_ROOT}/login`;
/** The code step of signing in, for an account with an authenticator. */
export const VERIFY_PATH = `${ADMIN_ROOT}/login/verify`;
/** Setting up the first authenticator, before the CMS opens. */
export const SETUP_PATH = `${ADMIN_ROOT}/two-factor`;

/** The pages around signing in. None of them is a place to return to. */
export const SIGN_IN_PATHS = [LOGIN_PATH, VERIFY_PATH, SETUP_PATH];

// What requireAdmin answers for a session without a code. Matched on the
// sentence by use-action, since an action's result carries nothing else
export const NEEDS_CODE_ERROR = "Enter your authenticator code to continue.";
export const NEEDS_SETUP_ERROR = "Set up two-factor sign-in to continue.";

/**
 * How far a signed in session is: "verified" entered a code from an
 * authenticator the account still has, "needs-code" has an authenticator but
 * no code yet, and "needs-setup" has no authenticator at all.
 */
export type TwoFactorState = "verified" | "needs-code" | "needs-setup";

/**
 * The authenticator apps that count, for the Security screen's list. One
 * that was started but never confirmed doesn't, so an abandoned setup never
 * asks for a code nobody can make.
 */
export const verifiedFactors = (user: Pick<User, "factors">) =>
  (user.factors ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

/**
 * Whether the account has a confirmed second factor of any kind. Supabase
 * counts a phone number or a passkey added outside the CMS too: with one, it
 * refuses a new authenticator until the session has a code. Going by apps
 * alone would send such an account to a setup page that can never finish.
 */
export const hasVerifiedFactor = (user: Pick<User, "factors">) =>
  (user.factors ?? []).some((factor) => factor.status === "verified");

/**
 * Where a session stands. Pass the user that getUser() returned on this same
 * client: that call checked the token with Supabase, so its "aal" claim can
 * be trusted, and its factors come from the database instead of the cookie.
 *
 * A token can still say aal2 for a while after the last authenticator was
 * removed. That counts as "needs-setup", so removing it takes effect at once.
 */
export const twoFactorState = async (
  supabase: Pick<SupabaseClient, "auth">,
  user: Pick<User, "factors">,
): Promise<TwoFactorState> => {
  if (!hasVerifiedFactor(user)) return "needs-setup";

  // Reads the token getUser() just checked, without another request. Anything
  // but a clear aal2 asks for the code
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2" ? "verified" : "needs-code";
};

/** The sign in step a session still has to take, or null when it's through. */
export const twoFactorStep = (state: TwoFactorState) => {
  if (state === "needs-code") return VERIFY_PATH;
  if (state === "needs-setup") return SETUP_PATH;
  return null;
};

const DEFAULT_NAME = "Authenticator";

/** A name no other authenticator has: Supabase refuses a double. */
export const freeFactorName = (taken: string[]) => {
  let name = DEFAULT_NAME;
  for (let count = 2; taken.includes(name); count++) {
    name = `${DEFAULT_NAME} ${count}`;
  }
  return name;
};

// For an account whose only factor isn't an authenticator app. The CMS has
// no step for those, and setup is closed while the factor is there
export const UNUSABLE_FACTOR_ERROR =
  "This account has a sign-in factor this page can't use. Remove it in the Supabase dashboard, under Authentication → Users.";

/** What to show under the code field when Supabase refused a code. */
export const codeErrorMessage = (error: AuthError) => {
  if (error.code === "mfa_verification_failed") {
    return "That code isn't right. Try the newest one from your app.";
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Too many tries. Wait a minute, then try again.";
  }
  return error.message || "Couldn't check the code. Try again.";
};
