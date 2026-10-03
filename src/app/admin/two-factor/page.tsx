import type { Metadata } from "next";
import AuthCard from "~/modules/cms/components/auth-card";
import SetupForm from "~/modules/cms/components/two-factor/setup-form";
import SignOutLink from "~/modules/cms/components/two-factor/sign-out-link";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { safeRedirectPath } from "~/modules/cms/utils/redirect-to";

export const metadata: Metadata = {
  title: "Set up two-factor",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

// Outside the CMS shell, like the login page: the proxy sends an account
// without an authenticator here before it gets to the CMS. Supabase itself
// refuses a new authenticator for an account that has one, unless the
// session entered a code, so the page needs no guard of its own
const TwoFactorSetupPage = async ({ searchParams }: Props) => {
  const { redirectTo } = await searchParams;
  const { onAdminHost } = await getAdminPaths();

  return (
    <AuthCard
      title="Set up two-factor"
      description="From now on, signing in takes your password and a code from an authenticator app. Scan the QR code with an app like Google Authenticator or 1Password, then enter the code it shows."
      footer={<SignOutLink />}
    >
      <SetupForm
        redirectTo={safeRedirectPath(redirectTo, onAdminHost) ?? ADMIN_ROOT}
      />
    </AuthCard>
  );
};

export default TwoFactorSetupPage;
