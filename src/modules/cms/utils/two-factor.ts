import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

export const LOGIN_PATH = `${ADMIN_ROOT}/login`;
export const VERIFY_PATH = `${ADMIN_ROOT}/login/verify`;
export const SETUP_PATH = `${ADMIN_ROOT}/two-factor`;

export const SIGN_IN_PATHS = [LOGIN_PATH, VERIFY_PATH, SETUP_PATH];

export const NEEDS_CODE_ERROR = "Enter your authenticator code to continue.";
export const NEEDS_SETUP_ERROR = "Set up two-factor sign-in to continue.";

export type TwoFactorState = "verified" | "needs-code" | "needs-setup";

export const verifiedFactors = (user: Pick<User, "factors">) =>
  (user.factors ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

export const hasVerifiedFactor = (user: Pick<User, "factors">) =>
  (user.factors ?? []).some((factor) => factor.status === "verified");

export const twoFactorState = async (
  supabase: Pick<SupabaseClient, "auth">,
  user: Pick<User, "factors">,
): Promise<TwoFactorState> => {
  if (!hasVerifiedFactor(user)) return "needs-setup";

  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2" ? "verified" : "needs-code";
};

export const twoFactorStep = (state: TwoFactorState) => {
  if (state === "needs-code") return VERIFY_PATH;
  if (state === "needs-setup") return SETUP_PATH;
  return null;
};

const DEFAULT_NAME = "Authenticator";

export const freeFactorName = (taken: string[]) => {
  let name = DEFAULT_NAME;
  for (let count = 2; taken.includes(name); count++) {
    name = `${DEFAULT_NAME} ${count}`;
  }
  return name;
};

export const UNUSABLE_FACTOR_ERROR =
  "This account has a sign-in factor this page can't use. Remove it in the Supabase dashboard, under Authentication → Users.";

export const codeErrorMessage = (error: AuthError) => {
  if (error.code === "mfa_verification_failed") {
    return "That code isn't right. Try the newest one from your app.";
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Too many tries. Wait a minute, then try again.";
  }
  return error.message || "Couldn't check the code. Try again.";
};
