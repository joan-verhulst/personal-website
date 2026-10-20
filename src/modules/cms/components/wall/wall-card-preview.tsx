"use client";

import { Google_Sans_Flex } from "next/font/google";
import type { WallItem } from "~/modules/content/types";
import WallTile from "~/modules/ui-ux/components/wall-tile";
import cn from "~/utils/cn";

const siteFont = Google_Sans_Flex({ subsets: ["latin"] });

const FILL_BELOW_LG =
  "max-lg:[&>span>span:last-child]:min-h-0 max-lg:[&>span>span:last-child]:flex-1 max-lg:[&>span>span:last-child>span>span]:absolute max-lg:[&>span>span:last-child>span>span]:inset-0 max-lg:[&>span>span:last-child>span>span]:aspect-auto";

interface WallCardPreviewProps {
  item: WallItem;
  className?: string;
}

const WallCardPreview = ({ item, className }: WallCardPreviewProps) => (
  <div
    className={cn(
      "flex justify-center rounded-xl bg-neutral-100 p-4 sm:p-6",
      className,
    )}
  >
    {/* The tile takes its size from the wall, which gives it a slot. This
        box is that slot: a 4:3 card, like most on the wall */}
    <div
      className={cn(
        siteFont.className,
        "relative aspect-4/3 w-full max-w-md tracking-normal",
      )}
    >
      <WallTile
        item={item}
        sizes="448px"
        className={cn("absolute inset-0 h-full", !item.bare && FILL_BELOW_LG)}
      />
    </div>
  </div>
);

export default WallCardPreview;
