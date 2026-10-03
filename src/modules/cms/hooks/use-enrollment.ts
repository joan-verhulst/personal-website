"use client";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { useCallback, useRef, useState } from "react";
import {
  codeErrorMessage,
  freeFactorName,
} from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

export interface Enrollment {
  factorId: string;
  /** The QR code as an image source. */
  qrCode: string;
  /** What the QR code holds, for typing into the app by hand. */
  secret: string;
}

export interface EnrollmentFailure {
  message: string;
  /** Supabase's error code, for a caller that acts on one. */
  code?: string;
}

const START_ERRORS = new Map([
  ["mfa_factor_name_conflict", "You already have one with that name."],
  [
    "too_many_enrolled_mfa_factors",
    "You have as many authenticators as Supabase allows. Remove one first.",
  ],
  [
    "insufficient_aal",
    "Enter a code from the authenticator you already have first.",
  ],
  [
    "mfa_totp_enroll_not_enabled",
    "Authenticator apps are turned off for this Supabase project. Turn TOTP on under Authentication → Multi-Factor in the dashboard.",
  ],
]);

const QR_PREFIX = "data:image/svg+xml;utf-8,";

// Supabase puts the SVG behind the prefix as it is. Encoded, a "#" or a
// quote in it can't cut the address short
const qrSource = (qrCode: string) =>
  qrCode.startsWith(QR_PREFIX)
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        qrCode.slice(QR_PREFIX.length),
      )}`
    : qrCode;

/**
 * Adds an authenticator app in two steps: start() makes a new secret to
 * scan, confirm() checks the first code from the app. Only a confirmed
 * authenticator counts, so stopping halfway never leaves the account asking
 * for codes nobody can make.
 *
 * Both resolve with what went wrong, or null when it worked.
 *
 * @example
 * const { enrollment, start, confirm } = useEnrollment();
 *
 * await start();
 * // enrollment.qrCode and enrollment.secret are there to show
 * const message = await confirm("123456");
 */
export const useEnrollment = () => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  // The same enrollment for callbacks, which outlive a render
  const current = useRef<Enrollment | null>(null);
  const isConfirmed = useRef(false);
  // A start that's still running, shared by whoever asks meanwhile. React
  // runs a mount effect twice in development, and two starts would remove
  // each other's secret
  const starting = useRef<Promise<EnrollmentFailure | null> | null>(null);
  // The name the last start was given, for starting over with it
  const lastName = useRef<string | undefined>(undefined);

  const show = useCallback((next: Enrollment | null) => {
    current.current = next;
    isConfirmed.current = false;
    setEnrollment(next);
  }, []);

  /** Makes a new secret. Without a name it gets one that's still free. */
  const start = useCallback(
    (name?: string) => {
      lastName.current = name;

      const run = async (): Promise<EnrollmentFailure | null> => {
        const supabase = createBrowserSupabase();
        const { data: factors, error: listError } =
          await supabase.auth.mfa.listFactors();
        if (listError) {
          return {
            message: isAuthSessionMissingError(listError)
              ? "You're signed out. Sign in again."
              : listError.message,
            code: listError.code,
          };
        }

        // Secrets from a setup that was never finished. They'd count towards
        // Supabase's limit, and could hold the name
        const leftovers = factors.all.filter(
          (factor) => factor.status === "unverified",
        );
        await Promise.all(
          leftovers.map((factor) =>
            supabase.auth.mfa.unenroll({ factorId: factor.id }),
          ),
        );

        const taken = factors.totp.map((factor) => factor.friendly_name ?? "");
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: name ?? freeFactorName(taken),
          // The name the app lists the account under
          issuer: window.location.host,
        });
        if (error) {
          return {
            message: START_ERRORS.get(error.code ?? "") ?? error.message,
            code: error.code,
          };
        }

        show({
          factorId: data.id,
          qrCode: qrSource(data.totp.qr_code),
          secret: data.totp.secret,
        });
        return null;
      };

      starting.current ??= run()
        .catch((error: unknown) => {
          console.error(error);
          return { message: "Couldn't make a QR code. Try again." };
        })
        .finally(() => {
          starting.current = null;
        });
      return starting.current;
    },
    [show],
  );

  /** Checks the first code. A right one turns the authenticator on. */
  const confirm = useCallback(
    async (code: string) => {
      const pending = current.current;
      if (!pending) return "Scan the QR code first.";

      const { error } =
        await createBrowserSupabase().auth.mfa.challengeAndVerify({
          factorId: pending.factorId,
          code,
        });
      if (!error) {
        isConfirmed.current = true;
        return null;
      }

      // Another tab started over and took this secret with it
      if (error.code === "mfa_factor_not_found") {
        show(null);
        const failure = await start(lastName.current);
        return (
          failure?.message ??
          "That QR code is no longer valid. Scan the new one and try again."
        );
      }
      return codeErrorMessage(error);
    },
    [show, start],
  );

  /** Drops a secret that was never confirmed, like when its dialog closes. */
  const discard = useCallback(async () => {
    const pending = current.current;
    if (!pending || isConfirmed.current) return;
    // Nothing to tell anyone when this fails: the next start cleans it up
    await createBrowserSupabase().auth.mfa.unenroll({
      factorId: pending.factorId,
    });
  }, []);

  /** Back to the beginning, ready for another start(). */
  const reset = useCallback(() => show(null), [show]);

  return { enrollment, start, confirm, discard, reset };
};
