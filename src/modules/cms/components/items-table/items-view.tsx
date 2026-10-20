"use client";

import { BrickWall, EyeOff, Images, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import Button from "~/modules/cms/components/button";
import Header from "~/modules/cms/components/header";
import Input from "~/modules/cms/components/input";
import { ITEMS } from "~/modules/cms/components/items-table/config";
import ItemsGrid, {
  type ItemCardData,
} from "~/modules/cms/components/items-table/items-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import Toolbar, { TabPanel, Tabs } from "~/modules/cms/components/toolbar";
import { liveUsage } from "~/modules/cms/utils/wall-preview";
import type { WallTagRow } from "~/modules/content/utils/rows";

type ItemsTab = "ui-ux" | "experiments";

const toTab = (value: string | null): ItemsTab =>
  value === "experiments" ? "experiments" : "ui-ux";

// Tag ids are slugs of letters, digits and dashes, so "*" can't clash with
// one. A select item can't have an empty value
const ALL_TAGS = "*";
const NO_TAG = "none";

const NEW_ITEM = "/admin/ui-ux/items/new";

interface Props {
  items: ItemCardData[];
  tags: WallTagRow[];
  experimentIds: string[];
}

const ItemsView = ({ items, tags, experimentIds }: Props) => {
  const searchParams = useSearchParams();
  const tabsId = useId();
  const [tab, setTab] = useState(() => toTab(searchParams.get("tab")));
  const [tagId, setTagId] = useState(ALL_TAGS);
  const [query, setQuery] = useState("");

  const byId = new Map(items.map((item) => [item.id, item]));
  const lists: Record<ItemsTab, ItemCardData[]> = {
    "ui-ux": items.filter((item) => !item.isInExperiments || item.isOnWall),
    experiments: experimentIds.flatMap((id) => byId.get(id) ?? []),
  };

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const needle = query.trim().toLowerCase();
  const visible = lists[tab].filter((item) => {
    if (tagId === NO_TAG ? item.tag_id : tagId !== ALL_TAGS && item.tag_id !== tagId)
      return false;
    if (!needle) return true;
    const tagLabel = tagById.get(item.tag_id ?? "")?.label ?? "";
    return `${item.title} ${tagLabel}`.toLowerCase().includes(needle);
  });

  const selectTab = (next: ItemsTab) => {
    if (next === tab) return;
    setTab(next);
    // Each tab starts unfiltered, so one tab's filter can't hide the other's
    // items
    setTagId(ALL_TAGS);
    setQuery("");
    const url = new URL(window.location.href);
    if (next === "experiments") url.searchParams.set("tab", next);
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };

  const onWall = items.filter((item) => item.isOnWall).length;
  const notOnSite = items.filter(
    (item) => !liveUsage(item.usage).length,
  ).length;

  const newItem = (
    <Button
      variant="primary"
      href={tab === "experiments" ? `${NEW_ITEM}?list=experiments` : NEW_ITEM}
    >
      New item
      <Plus size={16} aria-hidden />
    </Button>
  );

  return (
    <>
      <Header
        title={ITEMS.title}
        description={ITEMS.description}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Images aria-hidden />
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <span className="flex items-center gap-1.5">
              <BrickWall aria-hidden />
              {onWall} on the wall
            </span>
            <span className="flex items-center gap-1.5">
              <EyeOff aria-hidden />
              {notOnSite} not on the site
            </span>
          </>
        }
        actions={newItem}
      />

      <Toolbar
        start={
          <Tabs
            id={tabsId}
            label="Item lists"
            tabs={[
              { id: "ui-ux", label: "UI/UX", count: lists["ui-ux"].length },
              {
                id: "experiments",
                label: "Experiments",
                count: lists.experiments.length,
              },
            ]}
            value={tab}
            onChange={selectTab}
          />
        }
        end={
          <>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger aria-label="Filter by tag" className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TAGS}>All tags</SelectItem>
                <SelectItem value={NO_TAG}>No tag</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span
                      aria-hidden
                      className="mr-2 inline-block size-2 rounded-full align-middle"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input.Root className="sm:w-56">
              <Input.SearchField
                aria-label="Search items"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Input.Root>
          </>
        }
      />

      <TabPanel tabsId={tabsId} value={tab}>
        <ItemsGrid
          items={visible}
          total={lists[tab].length}
          tags={tags}
          kind={tab}
          newItem={newItem}
        />
      </TabPanel>
    </>
  );
};

export default ItemsView;
