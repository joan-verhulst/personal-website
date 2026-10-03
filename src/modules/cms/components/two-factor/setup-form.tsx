"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import CodeForm, {
  useCodeForm,
} from "~/modules/cms/components/two-factor/code-form";
import EnrollmentDetails from "~/modules/cms/components/two-factor/enrollment-details";
import { useEnrollment } from "~/modules/cms/hooks/use-enrollment";
import { withRedirectTo } from "~/modules/cms/utils/redirect-to";
import { VERIFY_PATH } from "~/modules/cms/utils/two-factor";

interface Props {
  /**
   * Where to go once it's set up: a canonical path, already checked to be a
   * CMS page.
   */
  redirectTo: string;
}

/**
 * Sets up the account's first authenticator: a QR code to scan, and the
 * first code from the app to prove the scan worked. Leaving halfway is fine,
 * the next visit starts with a fresh QR code.
 */
const SetupForm = ({ redirectTo }: Props) => {
  const router = useRouter();
  const { href, onAdminHost } = useAdminPath();
  // Stays pending while the CMS loads, so a second code can't be sent
  const [isLeaving, startLeaving] = useTransition();
  const { enrollment, start, confirm } = useEnrollment();
  const [startError, setStartError] = useState<string | null>(null);

  const begin = useCallback(async () => {
    setStartError(null);
    const failure = await start();
    if (!failure) return;

    // Shown for every failure, so the page never waits on a QR code that
    // isn't coming, not even when the redirect below ends up back here
    setStartError(failure.message);

    // The account has an authenticator after all, set up in another tab:
    // this session owes its code instead
    if (failure.code === "insufficient_aal") {
      router.replace(withRedirectTo(VERIFY_PATH, redirectTo, onAdminHost));
    }
  }, [start, router, redirectTo, onAdminHost]);

  useEffect(() => {
    begin();
  }, [begin]);

  const code = useCodeForm(async (value) => {
    const message = await confirm(value);
    if (message) return message;

    startLeaving(() => {
      router.replace(href(redirectTo));
      router.refresh();
    });
    return null;
  });

  if (startError) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-error-600 text-xs leading-normal">
          {startError}
        </p>
        <Button className="w-full" onClick={begin}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <EnrollmentDetails enrollment={enrollment} />
      {enrollment && (
        <CodeForm form={code} isLocked={isLeaving}>
          <Button
            type="submit"
            variant="primary"
            className="mt-2 w-full"
            isPending={code.isPending || isLeaving}
            withArrow
          >
            Turn on two-factor
          </Button>
        </CodeForm>
      )}
    </div>
  );
};

export default SetupForm;
