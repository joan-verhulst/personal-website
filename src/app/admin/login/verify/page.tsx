import type { Metadata } from "next";
import AuthCard from "~/modules/cms/components/auth-card";
import SignOutLink from "~/modules/cms/components/two-factor/sign-out-link";
import VerifyForm from "~/modules/cms/components/two-factor/verify-form";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { safeRedirectPath } from "~/modules/cms/utils/redirect-to";

export const metadata: Metadata = {
  title: "Enter your code",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

// The proxy only lets a session in here that has a password and still owes
// a code. Nothing on the page is worth guarding by itself
const VerifyPage = async ({ searchParams }: Props) => {
  const { redirectTo } = await searchParams;
  const { onAdminHost } = await getAdminPaths();

  return (
    <AuthCard
      title="Enter your code"
      description="Open your authenticator app and enter the code it shows for this site."
      footer={<SignOutLink />}
    >
      <VerifyForm
        redirectTo={safeRedirectPath(redirectTo, onAdminHost) ?? ADMIN_ROOT}
      />
    </AuthCard>
  );
};

export default VerifyPage;
