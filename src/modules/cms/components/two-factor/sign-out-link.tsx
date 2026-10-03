"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import { authLinkClass } from "~/modules/cms/components/auth-card";
import { LOGIN_PATH } from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

/**
 * The way out of a sign in step: back to the login page, to start over or
 * sign in as someone else. Without it a session that can't produce a code
 * would have nowhere to go.
 */
const SignOutLink = () => {
  const router = useRouter();
  const { href } = useAdminPath();
  const [isPending, startTransition] = useTransition();

  const signOut = () =>
    startTransition(async () => {
      // Only this session. Supabase's default ends every session of the
      // account, and a sign in that was never finished shouldn't be able to
      // sign out the device that did finish
      const { error } = await createBrowserSupabase().auth.signOut({
        scope: "local",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.replace(href(LOGIN_PATH));
      router.refresh();
    });

  return (
    <button
      type="button"
      className={`${authLinkClass} disabled:cursor-wait disabled:opacity-50`}
      disabled={isPending}
      onClick={signOut}
    >
      <LogOut size={16} aria-hidden />
      Sign out
    </button>
  );
};

export default SignOutLink;
