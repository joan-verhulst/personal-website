import { Undo2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { ownPages, pathOf } from "~/data/pages";
import { posts } from "~/data/posts";
import {
  getSections,
  type Section,
  sectionHint,
  sectionOf,
} from "~/data/sections";
import { siteData } from "~/data/site";
import { widgets } from "~/data/widgets";
import { useContent } from "~/modules/content/components/content-provider";
import type { Content } from "~/modules/content/types";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";
import IslandButton from "~components/layout/island/island-button";

const PostCover = dynamic(() => import("~/modules/blog/components/post-cover"));

interface Tile {
  id: string;
  label: string;
  area: string;
  href?: string;
  widget?: string;
  className?: string;
  style?: CSSProperties;
  image?: string;
  live?: ReactNode;
  inset?: "screen" | "record" | "cutout";
}

const [latest] = posts;

const getTiles = ({
  about,
  covers,
  highlights,
  products,
  records,
}: Content): Tile[] => {
  const [highlight] = highlights;
  const [product] = products;
  const [record] = records;

  return [
  {
    id: "about",
    label: widgets.about.label,
    area: "1 / 1 / 2 / 3",
    href: ownPages.about.path,
    className: "bg-neutral-400",
    image: about.image,
  },
  {
    id: "on-rotation",
    label: widgets.onRotation.label,
    area: "2 / 1 / 3 / 2",
    widget: "on-rotation",
    className: "bg-linear-to-b from-[#EBCA10] to-[#EB7E10]",
    image: record?.cover,
    inset: "record",
  },
  {
    id: "gear",
    label: widgets.gear.label,
    area: "2 / 2 / 3 / 3",
    widget: "gear",
    className: "bg-linear-to-b from-[#626D77] to-[#1E2D3C]",
    image: widgets.gear.image,
    inset: "cutout",
  },
  {
    id: "uiux",
    label: widgets.uiux.label,
    area: "1 / 3 / 3 / 7",
    href: "/ui-ux",
    style: highlight ? { background: getWallBackground(highlight) } : undefined,
    image: highlight?.media.src,
    inset: "screen",
  },
  {
    id: "digital-art",
    label: widgets.digitalArt.label,
    area: "3 / 1 / 5 / 3",
    href: "/digital-art",
    className: "bg-neutral-400",
    image: covers.digitalArt,
  },
  {
    id: "photography",
    label: widgets.photography.label,
    area: "3 / 3 / 5 / 5",
    href: "/photography",
    className: "bg-neutral-500",
    image: covers.photography,
  },
  {
    id: "blog",
    label: widgets.blog.label,
    area: "3 / 5 / 4 / 7",
    href: "/blog",
    className: "bg-neutral-900",
    live: latest && <PostCover post={latest} isSmall isStill />,
  },
  product
    ? {
        id: "products",
        label: widgets.products.label,
        href: "/products",
        area: "4 / 5 / 5 / 7",
        style: { background: getWallBackground(product) },
        live: (
          <WallMedia
            item={{
              title: product.name,
              media: product.media,
              bare: product.bare,
            }}
            sizes="160px"
          />
        ),
        inset: product.bare ? undefined : "screen",
      }
    : {
        id: "contact",
        label: widgets.contact.label,
        widget: "contact",
        area: "4 / 5 / 5 / 7",
        className: "bg-linear-to-b from-[#B1EB10] to-[#2FC72F]",
      },
  ];
};

const getHint = (tile: Tile, sections: Section[]) => {
  const section =
    tile.href !== undefined &&
    sections.find(({ href }) => href === pathOf(tile.href ?? ""));
  if (section) return sectionHint(section);
  return tile.widget ? "opens here" : "";
};

interface Props {
  pathname: string;
  isOpen: boolean;
  onVisit: (href: string) => void;
  onWidget: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
}

const IslandTray = ({
  pathname,
  isOpen,
  onVisit,
  onWidget,
  onBack,
  onClose,
}: Props) => {
  const haptic = useHapticSound();
  const content = useContent();
  const tiles = useMemo(() => getTiles(content), [content]);
  const sections = useMemo(() => getSections(content), [content]);
  const [pointed, setPointed] = useState<Tile | null>(null);

  const current = sectionOf(sections, pathname);
  const isHome = pathname === "/";

  return (
    <div className="flex size-full flex-col gap-2 px-3 pt-3 pb-3.5">
      <div className="flex h-7.5 shrink-0 items-center gap-2 whitespace-nowrap text-[13px]">
        {!isHome && (
          <IslandButton label="Go back" onClick={onBack}>
            <Undo2 className="size-3" />
          </IslandButton>
        )}
        <span className="min-w-0 flex-1 truncate">
          {pointed?.label ?? current?.label ?? siteData.owner.name}
          <span className="ml-2 text-neutral-50/60">
            {pointed ? getHint(pointed, sections) : current ? "open" : ""}
          </span>
        </span>
        <IslandButton label="Close" onClick={onClose}>
          <X className="size-3" />
        </IslandButton>
      </div>

      <div
        className="grid flex-1 grid-cols-6 grid-rows-4 gap-2"
        onMouseLeave={() => setPointed(null)}
      >
        {tiles.map((tile, index) => {
          const isCurrent =
            tile.href !== undefined && pathOf(tile.href) === current?.href;
          const className = cn(
            "relative overflow-hidden rounded-[10px] ring-1 ring-neutral-50/25 ring-inset transition duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
            !isOpen && "scale-50 opacity-0",
            isCurrent && "outline-2 outline-primary outline-offset-2",
            tile.className,
          );
          const style = {
            ...tile.style,
            gridArea: tile.area,
            transitionDelay: isOpen ? `${120 + index * 30}ms` : "0ms",
          };

          const cover = tile.live
            ? isOpen && tile.live
            : tile.image && (
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="160px"
                  className={cn(
                    "pointer-events-none",
                    tile.inset === "cutout"
                      ? "object-contain"
                      : "object-cover object-top",
                  )}
                />
              );
          const picture = cover && (
            <span
              className={cn(
                "pointer-events-none absolute overflow-hidden",
                !tile.inset && "inset-0",
                tile.inset === "screen" &&
                  "inset-x-[14%] top-[18%] bottom-0 rounded-t-md",
                tile.inset === "record" && "inset-[18%] rounded-full",
                tile.inset === "cutout" && "inset-[14%]",
              )}
            >
              {cover}
            </span>
          );

          if (!tile.href && !tile.widget)
            return (
              <div
                key={tile.id}
                aria-hidden
                className={cn(className, isOpen && "opacity-40")}
                style={style}
              >
                {picture}
              </div>
            );

          return (
            <button
              key={tile.id}
              type="button"
              aria-label={tile.label}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => {
                if (tile.href) onVisit(tile.href);
                else if (tile.widget) onWidget(tile.widget);
              }}
              onMouseEnter={() => {
                haptic.onMouseEnter();
                setPointed(tile);
              }}
              onFocus={() => setPointed(tile)}
              className={cn(className, "cursor-pointer hover:scale-95")}
              style={style}
            >
              {picture}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IslandTray;
