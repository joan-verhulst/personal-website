"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import { authLinkClass } from "~/modules/cms/components/auth-card";
import { LOGIN_PATH } from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

const SignOutLink = () => {
  const router = useRouter();
  const { href } = useAdminPath();
  const [isPending, startTransition] = useTransition();

  const signOut = () =>
    startTransition(async () => {
      // Only this session: the default would also sign out the finished device
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
