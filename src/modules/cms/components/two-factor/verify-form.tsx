"use client";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import CodeForm, {
  useCodeForm,
} from "~/modules/cms/components/two-factor/code-form";
import { withRedirectTo } from "~/modules/cms/utils/redirect-to";
import {
  codeErrorMessage,
  LOGIN_PATH,
  SETUP_PATH,
  UNUSABLE_FACTOR_ERROR,
} from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

interface Props {
  redirectTo: string;
}

const VerifyForm = ({ redirectTo }: Props) => {
  const router = useRouter();
  const { href, onAdminHost } = useAdminPath();
  // Stays pending while the CMS loads, so a second code can't be sent
  const [isLeaving, startLeaving] = useTransition();

  const leave = (path: string) =>
    startLeaving(() => {
      router.replace(path);
      router.refresh();
    });

  const code = useCodeForm(async (value) => {
    const supabase = createBrowserSupabase();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      if (!isAuthSessionMissingError(listError)) return listError.message;
      leave(withRedirectTo(LOGIN_PATH, redirectTo, onAdminHost));
      return "You're signed out. Sign in again.";
    }

    if (!data.totp.length) {
      if (data.all.some((factor) => factor.status === "verified")) {
        return UNUSABLE_FACTOR_ERROR;
      }
      leave(withRedirectTo(SETUP_PATH, redirectTo, onAdminHost));
      return null;
    }

    let message = "";
    for (const factor of data.totp) {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: value,
      });
      if (!error) {
        leave(href(redirectTo));
        return null;
      }
      message = codeErrorMessage(error);
      if (error.code !== "mfa_verification_failed") break;
    }
    return message;
  });

  return (
    <CodeForm form={code} shouldFocus isLocked={isLeaving}>
      <Button
        type="submit"
        variant="primary"
        className="mt-2 w-full"
        isPending={code.isPending || isLeaving}
        withArrow
      >
        Verify
      </Button>
    </CodeForm>
  );
};

export default VerifyForm;
