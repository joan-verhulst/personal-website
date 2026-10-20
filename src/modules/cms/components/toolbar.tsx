"use client";

import { type KeyboardEvent, type ReactNode, useRef } from "react";
import cn from "~/utils/cn";

interface ToolbarProps {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
}

const Toolbar = ({ start, end, className }: ToolbarProps) => (
  <div
    className={cn(
      "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
      className,
    )}
  >
    {start && (
      <div className="flex min-w-0 max-w-full items-center gap-2">{start}</div>
    )}
    {end && (
      <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:*:min-w-36 max-sm:*:flex-1 sm:ml-auto">
        {end}
      </div>
    )}
  </div>
);

export interface TabOption<T extends string = string> {
  id: T;
  label: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  id: string;
  label: string;
  tabs: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

const tabId = (id: string, tab: string) => `${id}-tab-${tab}`;
const panelId = (id: string) => `${id}-panel`;

export const Tabs = <T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  className,
}: TabsProps<T>) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = tabs.length - 1;
    const moves: Record<string, number | undefined> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    const tab = next === undefined ? undefined : tabs[next];
    if (next === undefined || !tab) return;

    event.preventDefault();
    onChange(tab.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex h-[35px] w-fit max-w-full items-stretch gap-1 overflow-x-auto rounded-xl border border-neutral-950/10 bg-white p-1 max-sm:h-11",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.id === value;

        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabId(id, tab.id)}
            aria-selected={isSelected}
            aria-controls={panelId(id)}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-1 max-sm:px-3",
              isSelected
                ? "bg-primary-500 font-medium text-white"
                : "text-neutral-600 hover:bg-neutral-950/5 hover:text-neutral-950",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tabular-nums">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface TabPanelProps {
  tabsId: string;
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({
  tabsId,
  value,
  children,
  className,
}: TabPanelProps) => (
  <div
    role="tabpanel"
    id={panelId(tabsId)}
    aria-labelledby={tabId(tabsId, value)}
    className={className}
  >
    {children}
  </div>
);

export default Toolbar;
