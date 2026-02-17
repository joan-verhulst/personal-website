"use client";

import { LineSquiggle, PencilRuler } from "lucide-react";
import cn from "~/utils/cn";

type TabType = "projects" | "snippets";

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}

const FloatingActionBar = ({ activeTab, onTabChange, className }: Props) => {
  return (
    <div
      className={cn(
        "fixed bottom-16 left-1/2 -translate-x-1/2 z-40",
        className,
      )}
    >
      <div className="flex items-center gap-1 rounded-xl border border-neutral-950/10 p-1">
        {/* Projects button */}
        <button
          onClick={() => onTabChange("projects")}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer",
            activeTab === "projects"
              ? "bg-primary-500 text-neutral-50"
              : "text-neutral-950/50",
          )}
          aria-label="View projects"
        >
          <PencilRuler className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {/* Snippets button */}
        <button
          onClick={() => onTabChange("snippets")}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer",
            activeTab === "snippets"
              ? "bg-primary-500 text-neutral-50"
              : "text-neutral-950/50",
          )}
          aria-label="View snippets"
        >
          <LineSquiggle className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default FloatingActionBar;
