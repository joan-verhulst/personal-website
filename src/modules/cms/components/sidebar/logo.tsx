import AdminLink from "~/modules/cms/components/admin-link";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";
import cn from "~/utils/cn";

interface Props {
  asLink?: boolean;
  onNavigate?: () => void;
  className?: string;
}

const Logo = ({ asLink = true, onNavigate, className }: Props) => {
  const content = (
    <span className="font-medium text-base text-primary-500">Content</span>
  );

  if (!asLink) {
    return (
      <div className={cn("flex w-fit items-center gap-2", className)}>
        {content}
      </div>
    );
  }

  return (
    <AdminLink
      href={ADMIN_ROOT}
      onClick={onNavigate}
      className={cn(
        "flex w-fit items-center gap-2 rounded-[10px] focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
        className,
      )}
    >
      {content}
    </AdminLink>
  );
};

export default Logo;
