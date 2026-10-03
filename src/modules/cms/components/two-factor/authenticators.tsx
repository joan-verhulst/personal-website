"use client";

import { Smartphone, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import Header from "~/modules/cms/components/header";
import Page from "~/modules/cms/components/page";
import Panel from "~/modules/cms/components/panel";
import AddAuthenticator from "~/modules/cms/components/two-factor/add-authenticator";
import { withRedirectTo } from "~/modules/cms/utils/redirect-to";
import {
  hasVerifiedFactor,
  SETUP_PATH,
  VERIFY_PATH,
} from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

const SECURITY_PATH = "/admin/security";

export interface Authenticator {
  id: string;
  name: string;
  /** The day it was added, ready to show. */
  added: string;
}

interface Props {
  authenticators: Authenticator[];
  /**
   * Whether supabase/migrations/0004_two_factor.sql still has to be run.
   * Until then only the CMS asks for the code, and the database doesn't.
   */
  needsMigration: boolean;
}

/**
 * The Security screen: the authenticator apps that can make a sign in code,
 * with a way to add a backup and to remove one, and what to do when they're
 * all lost.
 *
 * The only authenticator can be replaced but not removed. An account without
 * one is open to whoever has the password until a new one is set up, and
 * replacing never passes through that.
 */
const Authenticators = ({ authenticators, needsMigration }: Props) => {
  const router = useRouter();
  const { href, onAdminHost } = useAdminPath();
  const confirm = useConfirm();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const names = authenticators.map((authenticator) => authenticator.name);
  const isOnly = authenticators.length === 1;

  // Supabase goes by the session, the CMS by the session's token. When the
  // authenticator this session signed in with was removed on another device,
  // the token still says a code was entered for up to an hour. Renewing it
  // makes the two agree, and the proxy then lets the code step through
  const askForCode = async () => {
    await createBrowserSupabase().auth.refreshSession();
    toast.error("Enter your authenticator code again first.");
    router.replace(withRedirectTo(VERIFY_PATH, SECURITY_PATH, onAdminHost));
    router.refresh();
  };

  const remove = async ({ id, name }: Authenticator) => {
    const isConfirmed = await confirm({
      title: `Remove "${name}"?`,
      description: "Its codes will stop working for signing in.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!isConfirmed) return;

    setRemovingId(id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      setRemovingId(null);
      if (error.code === "insufficient_aal") await askForCode();
      else toast.error(error.message);
      return;
    }

    // The session's token still says a code was entered until it's renewed.
    // Renewing it now makes what the database sees match what was removed
    const { data } = await supabase.auth.refreshSession();
    toast.success("Authenticator removed");

    // The other one was removed elsewhere since this list loaded, so this
    // was the last after all
    if (data.user && !hasVerifiedFactor(data.user)) {
      router.replace(href(SETUP_PATH));
    }
    // Shows the shorter list. Or the code step, when the one that's gone is
    // the one this session signed in with
    router.refresh();
    setRemovingId(null);
  };

  return (
    <Page width="form">
      <Header
        title="Security"
        description="Signing in takes your password and a code from an authenticator app."
      />
      {needsMigration && (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-5">
          <p className="flex items-center gap-2 font-medium text-sm text-warning-800">
            <TriangleAlert size={16} aria-hidden />
            The database doesn't ask for the code yet
          </p>
          <p className="mt-2 max-w-[620px] text-neutral-700 text-xs leading-normal">
            Run supabase/migrations/0004_two_factor.sql in the Supabase SQL
            editor. Until then the CMS asks for your code, but your password
            alone can still change content by calling Supabase directly.
          </p>
        </div>
      )}
      <Panel
        title="Authenticators"
        description={
          isOnly
            ? "The app that makes your code for signing in. It's your only one, so it can be replaced but not removed."
            : "The apps that can make a code for signing in."
        }
        actions={<AddAuthenticator names={names} onNeedsCode={askForCode} />}
      >
        {authenticators.length === 0 && (
          <p className="text-neutral-600 text-xs leading-normal">
            No authenticator apps yet.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {authenticators.map((authenticator) => (
            <li
              key={authenticator.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-950/10 bg-white p-3"
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-50 text-primary-500"
              >
                <Smartphone size={16} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium text-neutral-950 text-sm">
                  {authenticator.name}
                </span>
                <span className="text-neutral-600 text-xs">
                  Added {authenticator.added}
                </span>
              </span>
              {isOnly ? (
                <AddAuthenticator
                  names={names}
                  replaces={authenticator}
                  onNeedsCode={askForCode}
                />
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  isPending={removingId === authenticator.id}
                  disabled={removingId !== null}
                  aria-label={`Remove ${authenticator.name}`}
                  onClick={() => remove(authenticator)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel
        title="If you lose your authenticator"
        description="Add a second one as a backup, on another device or in a password manager. Either one gets you in."
      >
        <p className="max-w-[620px] text-neutral-600 text-xs leading-normal">
          If you lose them all, open the Supabase dashboard, go to
          Authentication → Users, and choose "Remove MFA factors" from your
          account's menu. The next time you sign in, the CMS asks you to set
          up a new authenticator. Do that right away: until you have, your
          password alone is enough to set one up.
        </p>
      </Panel>
    </Page>
  );
};

export default Authenticators;
