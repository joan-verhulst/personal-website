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
  /**
   * Where to go once the code is in: a canonical path, already checked to be
   * a CMS page.
   */
  redirectTo: string;
}

/** The second step of signing in: a code from an authenticator app. */
const VerifyForm = ({ redirectTo }: Props) => {
  const router = useRouter();
  const { href, onAdminHost } = useAdminPath();
  // Stays pending while the CMS loads, so a second code can't be sent
  const [isLeaving, startLeaving] = useTransition();

  // Takes the address as this host spells it
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
      // A phone number or a passkey, added outside the CMS. Setup would be
      // refused while it's there, so this says what to do instead
      if (data.all.some((factor) => factor.status === "verified")) {
        return UNUSABLE_FACTOR_ERROR;
      }
      // The last authenticator was removed since this page opened
      leave(withRedirectTo(SETUP_PATH, redirectTo, onAdminHost));
      return null;
    }

    // The code doesn't say which app made it, so with a backup set up it's
    // tried on each. A wrong code moves on to the next, anything else stops
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
