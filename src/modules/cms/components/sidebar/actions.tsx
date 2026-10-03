"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef } from "react";
import { toast } from "sonner";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import { useConfirm } from "~/modules/cms/components/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/modules/cms/components/primitives/dropdown-menu";
import {
  hasUnsavedChanges,
  LEAVE_UNSAVED,
} from "~/modules/cms/hooks/use-unsaved-warning";
import { LOGIN_PATH } from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

interface Props {
  email: string;
  /** What the trigger button shows. */
  children: ReactNode;
  /** Called when the menu opens a page, so the mobile sheet can close. */
  onNavigate?: () => void;
}

/**
 * The account menu: who's signed in, the way to the Security page and Sign
 * out. View site and Refresh site are rows at the top of the sidebar.
 */
const Actions = ({ email, children, onNavigate }: Props) => {
  const router = useRouter();
  const { href } = useAdminPath();
  const confirm = useConfirm();
  // Set by a menu item, acted on once the menu has closed, so a question
  // about unsaved changes returns focus to the account button
  const requested = useRef<"security" | "sign-out" | null>(null);

  const openSecurity = async () => {
    // Asks first, like the sidebar's own links do
    if (hasUnsavedChanges() && !(await confirm(LEAVE_UNSAVED))) return;
    onNavigate?.();
    router.push(href("/admin/security"));
  };

  const signOut = async () => {
    // Signing out leaves the page, like any link would
    if (hasUnsavedChanges() && !(await confirm(LEAVE_UNSAVED))) return;
    const { error } = await createBrowserSupabase().auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace(href(LOGIN_PATH));
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${email}`}
          className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-neutral-950/10 bg-neutral-50 p-2 pr-3 text-left transition-colors duration-200 hover:border-neutral-950/20 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 data-[state=open]:border-neutral-950/20"
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      {/* Portalled outside the admin wrapper, data-cms brings its type scale */}
      <DropdownMenuContent
        data-cms
        side="top"
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        onCloseAutoFocus={() => {
          const action = requested.current;
          requested.current = null;
          if (action === "security") openSecurity();
          if (action === "sign-out") signOut();
        }}
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="font-medium text-neutral-950 text-xs">Account</span>
          <span className="truncate text-neutral-600 text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            requested.current = "security";
          }}
        >
          <ShieldCheck aria-hidden />
          Security
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="danger"
          onSelect={() => {
            requested.current = "sign-out";
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Actions;
