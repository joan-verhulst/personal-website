"use client";

import { Images, LayoutGrid, Shuffle } from "lucide-react";
import IslandButton from "~components/layout/island/island-button";
import type { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import type { PhotoView } from "~/modules/photography/components/print-card";
import cn from "~/utils/cn";

const VIEWS: { id: PhotoView; label: string; icon: typeof Images }[] = [
  { id: "table", label: "Table", icon: Images },
  { id: "grid", label: "Grid", icon: LayoutGrid },
];

interface Props {
  view: PhotoView;
  haptic: ReturnType<typeof useHapticSound>;
  onChange: (view: PhotoView) => void;
  onShuffle: () => void;
}

// Lives in the island, see IslandControls, so it's styled light on dark
const ViewSwitcher = ({ view, haptic, onChange, onShuffle }: Props) => {
  return (
    <div className="flex items-center gap-1.5">
      <fieldset
        aria-label="View"
        className="flex h-7 min-w-0 flex-1 items-center rounded-full border border-neutral-50/30 p-0.5"
      >
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => {
              haptic.onClick();
              onChange(id);
            }}
            onMouseEnter={haptic.onMouseEnter}
            className={cn(
              "flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[11.5px] transition-colors duration-200",
              view === id
                ? "bg-neutral-50 font-medium text-neutral-950"
                : "text-neutral-50/60 hover:text-neutral-50",
            )}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </fieldset>

      <IslandButton
        label="Shuffle"
        onClick={() => {
          haptic.onClick();
          onShuffle();
        }}
        className="size-7"
      >
        <Shuffle className="size-3" />
      </IslandButton>
    </div>
  );
};

export default ViewSwitcher;
