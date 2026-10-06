"use client";

import { ArrowUpRight, ExternalLink, Play, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteMediaFile, removeUnusedMedia } from "~/modules/cms/actions/media";
import AdminLink from "~/modules/cms/components/admin-link";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import CardGrid from "~/modules/cms/components/card-grid";
import { useConfirm } from "~/modules/cms/components/confirm";
import EmptyState from "~/modules/cms/components/empty-state";
import Header from "~/modules/cms/components/header";
import MediaCard, { CardMenu } from "~/modules/cms/components/media-card";
import Panel from "~/modules/cms/components/panel";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import StatCard from "~/modules/cms/components/stat-card";
import Toolbar from "~/modules/cms/components/toolbar";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import {
  folderKey,
  folderLabel,
  foldersOf,
} from "~/modules/cms/utils/media-folders";
import type { MediaFile } from "~/modules/cms/utils/read-media";
import {
  formatBytes,
  LIBRARY_FOLDER,
  STORAGE_LIMIT_BYTES,
  UNSAVED_GRACE_MS,
} from "~/modules/media/utils/media-types";
import cn from "~/utils/cn";

// Two columns on a phone, and from there a card never gets wider than this
const CARD_SIZES = "(min-width: 640px) 300px, 50vw";

const plural = (total: number, one: string, many: string) =>
  `${total} ${total === 1 ? one : many}`;

const totalSize = (files: MediaFile[]) =>
  files.reduce((total, file) => total + file.size, 0);

const ALL_FOLDERS = "all";
type Show = "all" | "used" | "unused";
type Sort = "largest" | "newest";

/** What deleting a file does, for the confirm dialog. */
const deleteWarning = (file: MediaFile) => {
  if (!file.usedBy.length) {
    return `It takes ${formatBytes(file.size)} and nothing on the site uses it. This can't be undone.`;
  }
  const users = file.usedBy.map((owner) => owner.label).join(", ");
  return `It's used by ${users}. ${file.usedBy.length === 1 ? "That stays" : "Those stay"}, without this file, and ${file.usedBy.length === 1 ? "is" : "are"} off the site until you pick another. This can't be undone.`;
};

interface StorageProps {
  used: number;
  /** Unused files old enough to remove. */
  removable: MediaFile[];
  onRemove: () => void;
  isPending: boolean;
}

/** How much of R2's free storage the bucket takes, and the way to free some. */
const Storage = ({ used, removable, onRemove, isPending }: StorageProps) => {
  const share = Math.min(1, used / STORAGE_LIMIT_BYTES);
  const left = Math.max(0, STORAGE_LIMIT_BYTES - used);

  return (
    <Panel
      title="Storage"
      description={`R2 stores ${formatBytes(STORAGE_LIMIT_BYTES)} for free. An upload that would go past that is refused, so the bucket never costs anything.`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-medium text-neutral-950 text-sm tabular-nums">
            {formatBytes(used)}
            <span className="font-normal text-neutral-600">
              {" "}
              of {formatBytes(STORAGE_LIMIT_BYTES)}
            </span>
          </p>
          <p className="text-neutral-600 text-xs tabular-nums">
            {formatBytes(left)} left
          </p>
        </div>
        {/* The numbers above say it in words, so the bar is only a picture */}
        <div aria-hidden className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn(
              "h-full rounded-full",
              share >= 0.9
                ? "bg-error-500"
                : share >= 0.75
                  ? "bg-warning-500"
                  : "bg-primary-500",
            )}
            // A sliver shows as soon as anything is stored
            style={{ width: `${used > 0 ? Math.max(share * 100, 0.5) : 0}%` }}
          />
        </div>
      </div>
      {removable.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
          <p className="text-neutral-600 text-xs leading-normal">
            {plural(removable.length, "unused file takes", "unused files take")}{" "}
            {formatBytes(totalSize(removable))}.
          </p>
          <Button
            variant="danger"
            size="sm"
            isPending={isPending}
            onClick={onRemove}
          >
            <Trash2 size={14} aria-hidden />
            Remove unused
          </Button>
        </div>
      )}
    </Panel>
  );
};

const FileCard = ({ file }: { file: MediaFile }) => {
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Set by the menu's Delete, acted on as the menu closes, so the dialog that
  // follows hands focus back to the menu's button
  const menuChoice = useRef<"delete" | null>(null);

  const isUnused = file.usedBy.length === 0;
  const open = () => window.open(file.url, "_blank", "noopener");

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${file.name}"?`,
      description: deleteWarning(file),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (isConfirmed) run(() => deleteMediaFile(file.path), "File deleted");
  };

  return (
    <MediaCard
      onClick={open}
      aspect="4/3"
      title={file.name}
      meta={[
        formatBytes(file.size),
        file.width > 0 && `${file.width}×${file.height}`,
        file.usedBy[0]?.label,
        file.usedBy.length > 1 && `+${file.usedBy.length - 1}`,
      ]
        .filter(Boolean)
        .join(" · ")}
      badge={
        (isUnused || file.kind === "video") && (
          <>
            {isUnused && <Badge tone="warning">Unused</Badge>}
            {file.kind === "video" && (
              <Badge>
                <Play aria-hidden className="fill-current" />
                Video
              </Badge>
            )}
          </>
        )
      }
      actions={
        <CardMenu
          label={`Actions for "${file.name}"`}
          isPending={isPending}
          onCloseAutoFocus={() => {
            const choice = menuChoice.current;
            menuChoice.current = null;
            if (choice === "delete") handleDelete();
          }}
        >
          <DropdownMenuItem onSelect={open}>
            <ExternalLink size={16} aria-hidden />
            Open file
          </DropdownMenuItem>
          {/* The other way round from the pickers: from the file to where
              it's used */}
          {file.usedBy.map((owner) => (
            <DropdownMenuItem key={`${owner.href}-${owner.label}`} asChild>
              <AdminLink href={owner.href}>
                <ArrowUpRight size={16} aria-hidden />
                <span className="truncate">{owner.label}</span>
              </AdminLink>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="danger"
            disabled={isPending}
            onSelect={() => {
              menuChoice.current = "delete";
            }}
          >
            <Trash2 size={16} aria-hidden />
            Delete
          </DropdownMenuItem>
        </CardMenu>
      }
    >
      {/* The card's button already names it, so the media stays silent */}
      {file.kind === "video" ? (
        <video
          // #t makes Safari show a first frame without a poster
          src={`${file.url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          aria-hidden
          className="absolute inset-0"
        />
      ) : (
        <Image
          // The display copy, straight from R2
          src={file.thumbUrl}
          alt=""
          fill
          sizes={CARD_SIZES}
          unoptimized
          // A logo shows whole, not cropped like the card's photos
          className={/\.svg$/i.test(file.path) ? "object-contain! p-6" : undefined}
        />
      )}
    </MediaCard>
  );
};

interface Props {
  files: MediaFile[];
  /** Everything in the bucket, display copies included. */
  usedBytes: number;
  /** Whether the media table exists, see 0006_media_library.sql. */
  hasDetails: boolean;
  /** When the page was read, so the server and browser agree on what's new. */
  now: number;
}

/**
 * Every file in the media bucket: upload here, see what uses each file and
 * how much of R2's free storage they take together, and delete what's no
 * longer needed. The pages pick their files from here, or upload their own.
 */
const MediaLibrary = ({ files, usedBytes, hasDetails, now }: Props) => {
  const router = useRouter();
  const [folder, setFolder] = useState(ALL_FOLDERS);
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  const uploaded = useRef(0);

  const unused = files.filter((file) => file.usedBy.length === 0);
  // A file without a readable date counts as new, so it's never removed in
  // bulk: it may belong to a form that's still open
  const removable = unused.filter(
    (file) => now - file.createdAt >= UNSAVED_GRACE_MS,
  );
  const videos = files.filter((file) => file.kind === "video").length;
  const folders = useMemo(() => foldersOf(files), [files]);

  const visible = useMemo(
    () =>
      files
        .filter(
          (file) =>
            (folder === ALL_FOLDERS || folderKey(file.folder) === folder) &&
            (show === "all" ||
              (show === "unused") === (file.usedBy.length === 0)),
        )
        .sort((a, b) =>
          sort === "largest" ? b.size - a.size : b.createdAt - a.createdAt,
        ),
    [files, folder, show, sort],
  );

  const removeUnused = async () => {
    const isConfirmed = await confirm({
      title: `Remove ${plural(removable.length, "unused file", "unused files")}?`,
      description: `They take ${formatBytes(totalSize(removable))} and nothing on the site uses them. This can't be undone.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!isConfirmed) return;

    const result = await run(
      () => removeUnusedMedia(removable.map((file) => file.path)),
      false,
    );
    if (result) toast.success(`Removed ${plural(result.removed ?? 0, "file", "files")}`);
  };

  return (
    <>
      <Header
        title="Media"
        description="Every image and video on the site, stored on Cloudflare R2. Upload here and pick them on the other pages, or upload there. A card opens its file."
        actions={
          <UploadButton
            folder={LIBRARY_FOLDER}
            accept="image/*,video/mp4,video/webm"
            multiple
            // Large enough for UI screenshots, the largest anything shows
            maxSize={3200}
            variant="primary"
            onUploaded={() => {
              uploaded.current += 1;
            }}
            onError={(message) => toast.error(message)}
            onUploadingChange={(isUploading) => {
              if (isUploading) {
                uploaded.current = 0;
                return;
              }
              if (uploaded.current) {
                toast.success(`Uploaded ${plural(uploaded.current, "file", "files")}`);
                router.refresh();
              }
            }}
          >
            Upload
          </UploadButton>
        }
        stats={
          <>
            <StatCard label="Files" value={files.length} />
            <StatCard label="Images" value={files.length - videos} />
            <StatCard label="Videos" value={videos} />
            <StatCard label="Unused" value={unused.length} />
          </>
        }
      />

      {!hasDetails && (
        <Panel
          title="Run the media migration"
          description="Run supabase/migrations/0006_media_library.sql in the Supabase SQL editor. Until then, Media can't remember names, sizes and colors, so files can't be picked on other pages, and a file that's in use can't be deleted."
        />
      )}

      <Storage
        used={usedBytes}
        removable={removable}
        onRemove={removeUnused}
        isPending={isPending}
      />

      <Toolbar
        end={
          <>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger aria-label="Filter by folder" className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
                {folders.map((name) => (
                  <SelectItem key={folderKey(name)} value={folderKey(name)}>
                    {folderLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={show} onValueChange={(value) => setShow(value as Show)}>
              <SelectTrigger aria-label="Filter by use" className="sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All files</SelectItem>
                <SelectItem value="used">In use</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
              <SelectTrigger aria-label="Sort" className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="largest">Largest first</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {visible.length > 0 ? (
        <CardGrid>
          {visible.map((file) => (
            <FileCard key={file.path} file={file} />
          ))}
        </CardGrid>
      ) : files.length > 0 ? (
        <EmptyState title="Nothing matches" hint="Try another folder or filter." />
      ) : (
        <EmptyState
          title="No media yet"
          hint="Upload here, or on any page that takes an image or video."
        />
      )}
    </>
  );
};

export default MediaLibrary;
