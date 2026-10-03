"use client";

import { type CSSProperties, Fragment, useState } from "react";
import { useContent } from "~/modules/content/components/content-provider";
import type { WallBlock, WallItem } from "~/modules/content/types";
import WallItemModal from "~/modules/ui-ux/components/wall-item-modal";
import WallTile from "~/modules/ui-ux/components/wall-tile";
import cn from "~/utils/cn";

// Fibonacci blocks on a 13 column grid, with 4:3 units so squares are 4:3 cards
const GRID_COLUMNS = 13;
// Width of one column: 13 columns with 12 gaps of 12px
const COLUMN = "(100cqw - 144px) / 13";

// Height of a block `rows` units tall
const getBlockHeight = (rows: number) =>
  `calc(${COLUMN} * ${0.75 * rows} + ${(rows - 1) * 12}px)`;

const getAspect = (item: WallItem) => item.media.width / item.media.height;

// Only open when there's something to read or visit
const canOpen = (item: WallItem) => Boolean(item.description || item.link);

// Media covers its card, so it can render wider than the card itself
const getSizes = (item: WallItem, columns: number, rows: number) => {
  const renderedColumns = Math.max(columns, rows * 0.75 * getAspect(item));
  const viewportWidth = Math.min(
    100,
    Math.ceil((renderedColumns / GRID_COLUMNS) * 100),
  );

  return `(min-width: 1024px) ${viewportWidth}vw, 100vw`;
};

const UiUxWall = () => {
  const { wall } = useContent();
  const [selectedItem, setSelectedItem] = useState<WallItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderTile = (
    item: WallItem,
    columns: number,
    rows: number,
    className?: string,
  ) => (
    <WallTile
      item={item}
      sizes={getSizes(item, columns, rows)}
      className={className}
      isLarge={columns === 8}
      onOpen={
        canOpen(item)
          ? () => {
              setSelectedItem(item);
              setIsModalOpen(true);
            }
          : undefined
      }
    />
  );

  const renderBlock = (block: WallBlock, mirrored: boolean) => {
    switch (block.layout) {
      case "spiral": {
        const [feature, medium, small, narrow] = block.items;
        const blockStyle = {
          "--block-height": getBlockHeight(8),
          "--feature-width": `calc(${COLUMN} * 8 + 84px)`,
        } as CSSProperties;

        return (
          <div
            className={cn(
              "flex flex-col gap-3 lg:h-(--block-height) lg:flex-row",
              mirrored && "lg:flex-row-reverse",
            )}
            style={blockStyle}
          >
            {renderTile(
              feature,
              8,
              8,
              "lg:h-full lg:w-(--feature-width) lg:shrink-0",
            )}
            <div className="flex min-w-0 flex-col gap-3 lg:grid lg:flex-1 lg:grid-cols-5 lg:grid-rows-8">
              {renderTile(medium, 5, 5, "lg:col-span-5 lg:row-span-5")}
              {renderTile(
                small,
                3,
                3,
                cn(
                  "lg:col-span-3 lg:row-span-3 lg:row-start-6",
                  mirrored ? "lg:col-start-3" : "lg:col-start-1",
                ),
              )}
              {renderTile(
                narrow,
                2,
                3,
                cn(
                  "lg:col-span-2 lg:row-span-3 lg:row-start-6",
                  mirrored ? "lg:col-start-1" : "lg:col-start-4",
                ),
              )}
            </div>
          </div>
        );
      }

      case "triple": {
        const [first, second, narrow] = block.items;

        return (
          <div
            className={cn(
              "flex flex-col gap-3 lg:grid lg:h-(--block-height)",
              mirrored
                ? "lg:grid-cols-[3fr_5fr_5fr]"
                : "lg:grid-cols-[5fr_5fr_3fr]",
            )}
            style={{ "--block-height": getBlockHeight(5) } as CSSProperties}
          >
            {renderTile(first, 5, 5)}
            {renderTile(second, 5, 5)}
            {renderTile(narrow, 3, 5, mirrored ? "lg:order-first" : undefined)}
          </div>
        );
      }

      // Two equal 4:3 halves, so there's nothing to mirror
      case "double": {
        const [first, second] = block.items;
        const blockStyle = {
          "--block-height": "calc((100cqw - 12px) / 2 * 0.75)",
        } as CSSProperties;

        return (
          <div
            className="flex flex-col gap-3 lg:grid lg:h-(--block-height) lg:grid-cols-2"
            style={blockStyle}
          >
            {renderTile(first, 6.5, 6.5)}
            {renderTile(second, 6.5, 6.5)}
          </div>
        );
      }
    }
  };

  return (
    <>
      <div className="px-3 pt-16 pb-3 md:px-4 lg:px-6">
        <div className="@container flex flex-col gap-3">
          {wall.map((block, blockIndex) => (
            <Fragment key={block.items[0].id}>
              {renderBlock(block, blockIndex % 2 === 1)}
            </Fragment>
          ))}
        </div>
      </div>

      <WallItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </>
  );
};

export default UiUxWall;
