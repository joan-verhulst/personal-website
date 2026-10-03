"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import type { ActionResult } from "~/modules/cms/utils/shared";
import {
  LOGIN_PATH,
  NEEDS_CODE_ERROR,
  NEEDS_SETUP_ERROR,
  SETUP_PATH,
  VERIFY_PATH,
} from "~/modules/cms/utils/two-factor";

const FALLBACK_ERROR = "Something went wrong.";

// What requireAdmin answers once the session has run out. Matched on the
// sentence, since an action's result carries nothing else to tell by
export const SIGNED_OUT_ERROR = "You're signed out. Sign in again.";

interface SessionStep {
  title: string;
  description: string;
  label: string;
  /** Canonical. The toast spells it for the host it's on. */
  path: string;
}

// What to do about a save the session was refused for: sign in again, enter
// the authenticator code, or set an authenticator up
const SESSION_STEPS = new Map<string, SessionStep>([
  [
    SIGNED_OUT_ERROR,
    {
      title: "You're signed out.",
      description: "Sign in in a new tab, then save again.",
      label: "Sign in",
      path: LOGIN_PATH,
    },
  ],
  [
    NEEDS_CODE_ERROR,
    {
      title: "Your authenticator code is needed.",
      description: "Enter it in a new tab, then save again.",
      label: "Enter code",
      path: VERIFY_PATH,
    },
  ],
  [
    NEEDS_SETUP_ERROR,
    {
      title: "Two-factor sign-in isn't set up.",
      description: "Set it up in a new tab, then save again.",
      label: "Set up",
      path: SETUP_PATH,
    },
  ],
]);

/**
 * Whether an action failed on the session instead of on what was saved. Every
 * action fails the same way then, so it's worth saying only once.
 */
export const isSessionError = (message: string) => SESSION_STEPS.has(message);

// Leaving to sign in would drop what's on the page, so the toast stays up and
// opens the step in a new tab. Save works again once that's done
const reportError = (message: string, href: (path: string) => string) => {
  const step = SESSION_STEPS.get(message);
  if (!step) {
    toast.error(message);
    return;
  }
  toast.error(step.title, {
    description: step.description,
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: step.label,
      onClick: () => window.open(href(step.path), "_blank", "noopener"),
    },
  });
};

// Next throws a redirect from an action as an error with this digest
const isRedirect = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  String(error.digest).startsWith("NEXT_REDIRECT");

/**
 * Runs a CMS action and reports how it went in a toast. A success reloads the
 * screen's data, so lists show what was just saved. A save that fails because
 * the session ran out, or lost its two-factor code, offers the way back in a
 * new tab.
 *
 * run() resolves with the result on success and null on failure, except when
 * the action returned fieldErrors: then it resolves with that failed result,
 * so a form can put the messages next to its fields. Check result.error
 * before treating a result as a success.
 *
 * Pass false as the message to skip the success toast, for saves that show
 * themselves, like a row moving.
 *
 * An action that ends in redirect(), like a delete from an edit page, counts
 * as a success: run() never resolves and Next navigates instead.
 *
 * @example
 * const result = await run(() => saveContact(values), "Contact saved");
 * if (result?.fieldErrors) setErrors(result.fieldErrors);
 */
export const useAction = () => {
  const router = useRouter();
  const { href } = useAdminPath();
  const [isPending, startTransition] = useTransition();

  const run = <Result extends ActionResult>(
    action: () => Promise<Result>,
    savedMessage: string | false = "Saved",
  ) =>
    new Promise<Result | null>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (result.error) {
            reportError(result.error, href);
            resolve(result.fieldErrors ? result : null);
            return;
          }
          if (savedMessage) toast.success(savedMessage);
          router.refresh();
          resolve(result);
        } catch (error) {
          if (isRedirect(error) && savedMessage) toast.success(savedMessage);
          // Hands redirects back to Next, which follows them
          unstable_rethrow(error);
          const message =
            error instanceof Error ? error.message : FALLBACK_ERROR;
          toast.error(message);
          resolve(null);
        }
      });
    });

  return { run, isPending };
};
