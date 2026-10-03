import { ChevronsUpDown } from "lucide-react";
import Actions from "~/modules/cms/components/sidebar/actions";

interface Props {
  email: string;
  /** Called when the menu opens a page, so the mobile sheet can close. */
  onNavigate?: () => void;
}

/** The account card at the bottom of the sidebar, which opens the account menu. */
const Profile = ({ email, onNavigate }: Props) => (
  <Actions email={email} onNavigate={onNavigate}>
    <span
      aria-hidden
      className="grid size-8 shrink-0 select-none place-items-center rounded-md bg-neutral-950 font-medium text-sm text-white"
    >
      {email.charAt(0).toUpperCase()}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate font-medium text-neutral-600 text-xs">
        {email}
      </span>
      <span className="text-neutral-600 text-xs">Admin</span>
    </span>
    <ChevronsUpDown size={16} className="shrink-0 text-neutral-600" />
  </Actions>
);

export default Profile;
