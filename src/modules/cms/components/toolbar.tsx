"use client";

import { type KeyboardEvent, type ReactNode, useRef } from "react";
import cn from "~/utils/cn";

interface ToolbarProps {
  /** The left end: the page's <Tabs />, when it has a top-level split. */
  start?: ReactNode;
  /** The right end: filters as selects, then the search field. */
  end?: ReactNode;
  className?: string;
}

/**
 * The one row above a collection that holds everything that changes what it
 * shows: tabs on the left, filters and search on the right. On a phone the
 * right end wraps under the tabs and its fields share the full width.
 *
 * @example
 * <Toolbar
 *   start={<Tabs id={tabsId} label="Item lists" tabs={TABS} value={tab} onChange={setTab} />}
 *   end={
 *     <>
 *       <Select value={tagId} onValueChange={setTagId}>
 *         <SelectTrigger aria-label="Filter by tag" className="sm:w-44">...</SelectTrigger>
 *       </Select>
 *       <Input.Root className="sm:w-56">
 *         <Input.SearchField aria-label="Search items" placeholder="Search" />
 *       </Input.Root>
 *     </>
 *   }
 * />
 */
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
      // On a phone the fields grow to share the row, whatever width they
      // were given for larger screens
      <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:*:min-w-36 max-sm:*:flex-1 sm:ml-auto">
        {end}
      </div>
    )}
  </div>
);

export interface TabOption<T extends string = string> {
  id: T;
  label: ReactNode;
  /** A number after the label, like how many items the tab holds. */
  count?: number;
}

interface TabsProps<T extends string> {
  /** Shared with the <TabPanel />, which uses it to name itself after its tab. */
  id: string;
  /** What the tabs switch between, for screen readers, like "Item lists". */
  label: string;
  tabs: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

const tabId = (id: string, tab: string) => `${id}-tab-${tab}`;
const panelId = (id: string) => `${id}-panel`;

/**
 * Segmented tabs for a page's top-level split, like UI/UX and Experiments on
 * the items page. Anything finer is a filter, and goes in a select. Arrow
 * keys, Home and End move between the tabs and select as they go; Tab leaves
 * for the panel. Show the selected tab's content in a <TabPanel />.
 *
 * @example
 * const tabsId = useId();
 * <Tabs
 *   id={tabsId}
 *   label="Item lists"
 *   tabs={[
 *     { id: "ui-ux", label: "UI/UX", count: 17 },
 *     { id: "experiments", label: "Experiments", count: 4 },
 *   ]}
 *   value={tab}
 *   onChange={setTab}
 * />
 * <TabPanel tabsId={tabsId} value={tab}>...</TabPanel>
 */
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
    // The arrows wrap around at both ends
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
      // As tall as the fields next to it in the toolbar, and taller on a
      // phone, where the tabs are pressed with a finger
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
            // Only the selected tab is a tab stop, the arrows reach the rest
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
  /** The id given to the <Tabs /> it belongs to. */
  tabsId: string;
  /** The selected tab, whose content this shows. */
  value: string;
  children: ReactNode;
  className?: string;
}

/** The content of the selected tab, named after that tab for screen readers. */
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
