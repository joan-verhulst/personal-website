"use client";

import { Plus, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import { cardGridClass } from "~/modules/cms/components/card-grid";
import { Placeholder } from "~/modules/cms/components/empty-state";
import ItemCard, { itemCardClass } from "~/modules/cms/components/item-card";
import Panel from "~/modules/cms/components/panel";
import ReorderButton from "~/modules/cms/components/reorder-button";
import ItemPickerDialog from "~/modules/cms/components/wall/item-picker-dialog";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/media/utils/media-url";

interface ListEditorProps {
  items: WallItemRow[];
  tags: WallTagRow[];
  /**
   * The list as it's being edited. The wall screen holds it, and saves it
   * with the Save in the bottom bar.
   */
  value: string[];
  onChange: (value: string[]) => void;
  /** Holds the list still while the page saves. */
  isPending?: boolean;
}

// What the home page widget expects in its first two places
const WIDGET_SLOTS = ["image", "video"] as const;

interface ListCardProps {
  item?: WallItemRow;
  tags: WallTagRow[];
  /** Its place, like "1" or "Highlight 1", over the thumbnail. */
  label: string;
  /** A button right of the title, like Remove. */
  corner?: ReactNode;
  /** Under the text: a badge, a button. */
  children?: ReactNode;
}

/** One place in a list: what fills it, with its place over the thumbnail. */
const ListCard = ({ item, tags, label, corner, children }: ListCardProps) => (
  <li className={itemCardClass}>
    <ItemCard
      item={item}
      tag={item && tags.find((tag) => tag.id === item.tag_id)}
      sizes="240px"
      corner={corner}
      overlay={
        <Badge className="absolute top-1.5 left-1.5 tabular-nums">{label}</Badge>
      }
    >
      {children}
    </ItemCard>
  </li>
);

/** Side projects and motion studies, in the order the modal shows them. */
export const ExperimentsEditor = ({
  items,
  tags,
  value: list,
  onChange,
  isPending,
}: ListEditorProps) => {
  const [isPicking, setIsPicking] = useState(false);

  const byId = (id: string) => items.find((item) => item.id === id);
  const titleOf = (id: string) => byId(id)?.title || "Untitled";

  return (
    <Panel
      title="Experiments"
      description="Side projects and motion studies, in the experiments modal. The first two fill the home page widget: an image, then a video."
      actions={
        <>
          <Button disabled={isPending} onClick={() => setIsPicking(true)}>
            <Plus size={16} aria-hidden />
            Add item
          </Button>
          <ReorderButton
            title="Reorder experiments"
            description="Drag the rows, or use their arrow buttons, to change the order. It's saved with the page."
            // The order lands in the list here, the page's Save keeps it
            saveLabel="Apply order"
            disabled={isPending}
            items={list.map((id) => {
              const item = byId(id);
              return {
                id,
                title: titleOf(id),
                // Nothing to show for an item whose file was deleted
                thumbnail: !item?.media ? undefined : item.media_type ===
                  "image" ? (
                  <Image
                    src={mediaUrl(item.media)}
                    alt=""
                    fill
                    sizes="48px"
                  />
                ) : (
                  <video src={mediaUrl(item.media)} muted preload="metadata" />
                ),
              };
            })}
            onSave={(ids) => {
              onChange(ids);
              return true;
            }}
          />
        </>
      }
    >
      {list.length ? (
        <ol className={cardGridClass()}>
          {list.map((id, index) => {
            const item = byId(id);
            const expected = WIDGET_SLOTS[index];
            const fitsWidget = !expected || item?.media_type === expected;

            return (
              <ListCard
                key={id}
                item={item}
                tags={tags}
                label={String(index + 1)}
                corner={
                  // Takes it out of the list only, so it isn't a delete
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${titleOf(id)} from the experiments`}
                    disabled={isPending}
                    className="-mt-1 -mr-1"
                    onClick={() => onChange(list.filter((other) => other !== id))}
                  >
                    <X size={16} aria-hidden />
                  </Button>
                }
              >
                {expected && (
                  <Badge
                    tone={fitsWidget ? "primary" : "warning"}
                    className="mt-1 max-w-full whitespace-normal"
                  >
                    {fitsWidget
                      ? "Home widget"
                      : `Home widget wants a ${expected} here`}
                  </Badge>
                )}
              </ListCard>
            );
          })}
        </ol>
      ) : (
        <Placeholder>No experiments yet. Add an item to start.</Placeholder>
      )}

      <ItemPickerDialog
        open={isPicking}
        onOpenChange={setIsPicking}
        title="Add to the experiments"
        description="It goes at the end of the list."
        items={items}
        tags={tags}
        disabledReason={(item) =>
          list.includes(item.id) ? "Already in the experiments" : undefined
        }
        onPick={(id) => onChange([...list, id])}
      />
    </Panel>
  );
};

/** The two screenshots that take turns on the home page's UI/UX widget. */
export const HighlightsEditor = ({
  items,
  tags,
  value: picks,
  onChange,
  isPending,
}: ListEditorProps) => {
  const [isPicking, setIsPicking] = useState(false);
  // Which highlight the picker chooses for. Kept after closing, so the
  // title doesn't change during the exit animation.
  const [pickingFor, setPickingFor] = useState(0);
  // The site needs both, so one on its own isn't saved
  const isHalfPicked = picks.some(Boolean) && !picks.every(Boolean);

  return (
    <Panel
      title="Home highlights"
      description="The two screenshots that take turns on the UI/UX widget. Images only."
    >
      <ul className={cardGridClass()}>
        {picks.map((value, index) => {
          const item = items.find((other) => other.id === value);

          return (
            <ListCard
              key={index === 0 ? "first" : "second"}
              item={item}
              tags={tags}
              label={`Highlight ${index + 1}`}
            >
              <span className="mt-auto block w-full pt-1.5">
                <Button
                  size="sm"
                  className="w-full"
                  aria-label={`${item ? "Change" : "Pick an image for"} highlight ${index + 1}`}
                  disabled={isPending}
                  onClick={() => {
                    setPickingFor(index);
                    setIsPicking(true);
                  }}
                >
                  {item ? "Change" : "Pick an image"}
                </Button>
              </span>
            </ListCard>
          );
        })}
      </ul>
      {isHalfPicked && (
        <output className="text-neutral-600 text-xs leading-normal">
          Pick both highlights to save them.
        </output>
      )}

      <ItemPickerDialog
        open={isPicking}
        onOpenChange={setIsPicking}
        title={`Pick highlight ${pickingFor + 1}`}
        items={items}
        tags={tags}
        // Images only, and not the one already in the other place
        disabledReason={(item) =>
          item.media_type !== "image"
            ? "Images only"
            : item.id === picks[1 - pickingFor]
              ? `Already highlight ${2 - pickingFor}`
              : undefined
        }
        note={(item) => (item.id === picks[pickingFor] ? "Current" : undefined)}
        onPick={(id) =>
          onChange(pickingFor === 0 ? [id, picks[1]] : [picks[0], id])
        }
      />
    </Panel>
  );
};
