import type { ReactNode } from "react";
import { panelClass } from "~/modules/cms/components/panel";
import Logo from "~/modules/cms/components/sidebar/logo";

export const authLinkClass =
  "flex cursor-pointer items-center gap-1.5 rounded-[10px] px-2 py-1 font-medium text-neutral-600 text-xs transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500";

interface AuthCardProps {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const AuthCard = ({ title, description, children, footer }: AuthCardProps) => (
  <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4 py-10">
    <div className="flex w-full max-w-[400px] flex-col items-center gap-4">
      <div className={`${panelClass} flex w-full flex-col gap-6 p-5 sm:p-6`}>
        {/* The same box as a section in the CMS. The sidebar's logo sits in
            it without its link: the CMS is behind these pages */}
        <Logo asLink={false} />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-medium text-neutral-950 text-xl">{title}</h1>
          <p className="text-neutral-600 text-sm leading-normal">
            {description}
          </p>
        </div>
        {children}
      </div>
      {footer}
    </div>
  </main>
);

export default AuthCard;
