"use client";

import Logo from "~/modules/cms/components/sidebar/logo";
import Nav from "~/modules/cms/components/sidebar/nav";
import Profile from "~/modules/cms/components/sidebar/profile";
import QuickActions from "~/modules/cms/components/sidebar/quick-actions";
import cn from "~/utils/cn";

interface SidebarContentProps {
  email: string;
  onNavigate?: () => void;
  className?: string;
}

export const SidebarContent = ({
  email,
  onNavigate,
  className,
}: SidebarContentProps) => (
  <div className={cn("flex min-h-0 flex-col", className)}>
    <div className="px-4 pt-4 pb-3">
      <Logo onNavigate={onNavigate} />
    </div>
    {/* Only the links scroll, so the account card stays in view */}
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
      <QuickActions />
      <Nav onNavigate={onNavigate} />
    </div>
    <div className="p-2">
      <Profile email={email} onNavigate={onNavigate} />
    </div>
  </div>
);

interface SidebarProps {
  email: string;
}

const Sidebar = ({ email }: SidebarProps) => (
  <aside className="hidden h-dvh w-[252px] shrink-0 bg-neutral-100 md:flex md:flex-col">
    <SidebarContent email={email} className="flex-1" />
  </aside>
);

export default Sidebar;
