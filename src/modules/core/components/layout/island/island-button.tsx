import type { ReactNode } from "react";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";

interface Props {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

/** The small round button on the island, for going back and for closing it. */
const IslandButton = ({ label, onClick, className, children }: Props) => {
  const haptic = useHapticSound();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={haptic.onMouseEnter}
      className={cn(
        "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-50/30 transition-colors hover:border-neutral-50/60",
        className,
      )}
    >
      {children}
    </button>
  );
};

export default IslandButton;
