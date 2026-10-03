import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import AuthCard, { authLinkClass } from "~/modules/cms/components/auth-card";
import LoginForm from "~/modules/cms/components/login-form";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { safeRedirectPath } from "~/modules/cms/utils/redirect-to";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

const LoginPage = async ({ searchParams }: Props) => {
  const { redirectTo } = await searchParams;
  const { onAdminHost, siteUrl } = await getAdminPaths();

  return (
    <AuthCard
      title="Sign in"
      description="Sign in with your email and password to edit the site."
      footer={
        // A full address on the admin host, where "/" is the dashboard
        <a href={siteUrl} className={authLinkClass}>
          <ArrowLeft size={16} aria-hidden />
          Back to the site
        </a>
      }
    >
      <LoginForm
        redirectTo={safeRedirectPath(redirectTo, onAdminHost) ?? ADMIN_ROOT}
      />
    </AuthCard>
  );
};

export default LoginPage;
