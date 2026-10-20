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

export const SIGNED_OUT_ERROR = "You're signed out. Sign in again.";

interface SessionStep {
  title: string;
  description: string;
  label: string;
  path: string;
}

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

export const isSessionError = (message: string) => SESSION_STEPS.has(message);

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

const isRedirect = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  String(error.digest).startsWith("NEXT_REDIRECT");

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
