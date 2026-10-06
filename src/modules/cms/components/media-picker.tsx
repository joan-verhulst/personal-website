"use client";

import type { VariantProps } from "class-variance-authority";
import { Check, Images, Play } from "lucide-react";
import Image from "next/image";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listMediaLibrary } from "~/modules/cms/actions/media";
import Button, { type buttonVariants } from "~/modules/cms/components/button";
import { cardGridClass } from "~/modules/cms/components/card-grid";
import { Placeholder } from "~/modules/cms/components/empty-state";
import Input from "~/modules/cms/components/input";
import {
  Dialog,
  DialogClose,
  DialogShell,
} from "~/modules/cms/components/primitives/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import { folderKey, folderLabel, foldersOf } from "~/modules/cms/utils/media-folders";
import type { MediaFile } from "~/modules/cms/utils/read-media";
import type { UploadedMedia } from "~/modules/cms/utils/upload-media";
import { formatBytes } from "~/modules/media/utils/media-types";
import cn from "~/utils/cn";

/** What a place takes: images, videos, either, or only SVGs (tag logos). */
export type MediaAccept = "image" | "video" | "any" | "svg";

const isSvg = (file: MediaFile) => /\.svg$/i.test(file.path);

const accepts = (accept: MediaAccept, file: MediaFile) =>
  accept === "any" ||
  (accept === "svg" ? isSvg(file) : file.kind === accept);

// A form needs the size to lay a file out. Every upload measures it, so only
// a file from before the media table can be without
const isUsable = (file: MediaFile) => file.width > 0 && file.height > 0;

/** A file from Media as a form takes it: the same as a fresh upload. */
const toUploadedMedia = (file: MediaFile): UploadedMedia => ({
  path: file.path,
  url: file.url,
  type: file.kind,
  name: file.name,
  width: file.width,
  height: file.height,
  hue: file.hue,
  chroma: file.chroma,
});

const ALL_FOLDERS = "all";
const PLACEHOLDERS = Array.from({ length: 8 }, (_, index) => index);

type LibraryState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; files: MediaFile[] };

interface FileButtonProps {
  file: MediaFile;
  isPicked: boolean;
  onToggle: () => void;
  /** Picks this one file straight away, for a double click. */
  onPick: () => void;
}

const FileButton = ({ file, isPicked, onToggle, onPick }: FileButtonProps) => {
  const isEnabled = isUsable(file);

  return (
    <button
      type="button"
      aria-pressed={isPicked}
      disabled={!isEnabled}
      onClick={onToggle}
      onDoubleClick={onPick}
      className={cn(
        "flex w-full min-w-0 cursor-pointer flex-col rounded-xl border bg-white p-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isPicked
          ? "border-primary-500 ring-1 ring-primary-500"
          : "border-neutral-950/10 hover:border-neutral-950/20",
      )}
    >
      <span className="relative block aspect-4/3 overflow-hidden rounded-lg bg-neutral-100">
        {file.kind === "video" ? (
          <video
            // #t makes Safari show a first frame without a poster
            src={`${file.url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Image
            // The display copy, straight from R2
            src={file.thumbUrl}
            alt=""
            fill
            sizes="160px"
            unoptimized
            className={isSvg(file) ? "object-contain p-4" : "object-cover"}
          />
        )}
        {file.kind === "video" && (
          <span className="absolute bottom-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-neutral-950/60 text-white">
            <Play size={10} aria-hidden className="fill-current" />
            <span className="sr-only">Video</span>
          </span>
        )}
        {isPicked && (
          <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-primary-500 text-white">
            <Check size={12} aria-hidden strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 px-2 pt-2 pb-1.5 text-xs">
        <span className="truncate font-medium text-neutral-950">
          {file.name}
        </span>
        <span className="truncate text-neutral-600">
          {isEnabled
            ? [formatBytes(file.size), file.usedBy.length > 0 && "In use"]
                .filter(Boolean)
                .join(" · ")
            : "Size unknown, upload it again"}
        </span>
      </span>
    </button>
  );
};

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  accept: MediaAccept;
  /** Lets several files be picked, for adding a batch at once. */
  multiple?: boolean;
  /** The main button's label, by how many files are picked. */
  pickLabel: (count: number) => string;
  onPick: (files: UploadedMedia[]) => void;
}

/**
 * Picks files that are already in Media, newest first, to use the way an
 * upload would be. The library is read fresh each time it opens, so files
 * uploaded on another page are there too. A double click picks one file
 * right away.
 */
export const MediaPicker = ({
  open,
  onOpenChange,
  title,
  description,
  accept,
  multiple,
  pickLabel,
  onPick,
}: MediaPickerProps) => {
  const [library, setLibrary] = useState<LibraryState>({ status: "loading" });
  const [picked, setPicked] = useState<string[]>([]);
  const [folder, setFolder] = useState(ALL_FOLDERS);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    let isCurrent = true;
    setLibrary({ status: "loading" });
    listMediaLibrary()
      .then((result) => {
        if (!isCurrent) return;
        setLibrary(
          result.files
            ? { status: "ready", files: result.files }
            : { status: "failed", message: result.error ?? "Couldn't read Media." },
        );
      })
      .catch(() => {
        if (isCurrent) {
          setLibrary({ status: "failed", message: "Couldn't read Media. Try again." });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Each opening starts over: fresh files, nothing picked
  useEffect(() => {
    if (!open) return;
    setPicked([]);
    return load();
  }, [open, load]);

  const files = useMemo(
    () =>
      library.status === "ready"
        ? library.files
            .filter((file) => accepts(accept, file))
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [library, accept],
  );

  const visible = files.filter(
    (file) =>
      (folder === ALL_FOLDERS || folderKey(file.folder) === folder) &&
      file.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (path: string) =>
    setPicked((current) => {
      if (!multiple) return current[0] === path ? [] : [path];
      return current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path];
    });

  const pick = (paths: string[]) => {
    const chosen = paths.flatMap((path) => {
      const file = files.find((item) => item.path === path);
      return file ? [toUploadedMedia(file)] : [];
    });
    if (!chosen.length) return;
    onOpenChange(false);
    onPick(chosen);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        title={title}
        description={description}
        toolbar={
          <div className="flex flex-wrap gap-2 max-sm:*:min-w-36 max-sm:*:flex-1">
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger aria-label="Filter by folder" className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
                {foldersOf(files).map((name) => (
                  <SelectItem key={folderKey(name)} value={folderKey(name)}>
                    {folderLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input.Root className="sm:w-56">
              <Input.SearchField
                aria-label="Search by name"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Input.Root>
          </div>
        }
        footer={
          <>
            <DialogClose asChild>
              <Button className="w-full sm:w-fit">Cancel</Button>
            </DialogClose>
            <Button
              variant="primary"
              className="w-full sm:w-fit"
              disabled={!picked.length}
              onClick={() => pick(picked)}
            >
              {pickLabel(Math.max(1, picked.length))}
            </Button>
          </>
        }
      >
        {library.status === "loading" && (
          <div className={cardGridClass("compact")} aria-busy aria-live="polite">
            <span className="sr-only">Loading Media…</span>
            {PLACEHOLDERS.map((placeholder) => (
              <Skeleton key={placeholder} className="aspect-[4/3.6] rounded-xl" />
            ))}
          </div>
        )}
        {library.status === "failed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-neutral-600 text-sm">{library.message}</p>
            <Button onClick={load}>Try again</Button>
          </div>
        )}
        {library.status === "ready" &&
          (visible.length > 0 ? (
            <ul className={cardGridClass("compact")}>
              {visible.map((file) => (
                <li key={file.path} className="flex min-w-0">
                  <FileButton
                    file={file}
                    isPicked={picked.includes(file.path)}
                    onToggle={() => toggle(file.path)}
                    onPick={() => pick([file.path])}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Placeholder>
              {files.length
                ? "Nothing matches. Try another folder or name."
                : "Nothing in Media fits here yet. Upload a file instead."}
            </Placeholder>
          ))}
      </DialogShell>
    </Dialog>
  );
};

interface ChooseFromMediaProps extends Omit<MediaPickerProps, "open" | "onOpenChange"> {
  children: ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: "default" | "sm";
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

/**
 * The button next to an upload button that picks from Media instead. It
 * hands over the same thing an upload does.
 *
 * @example
 * <ChooseFromMedia
 *   title="Choose a photo"
 *   accept="image"
 *   pickLabel={() => "Use photo"}
 *   onPick={([media]) => setImage(media)}
 * >
 *   Choose from Media
 * </ChooseFromMedia>
 */
export const ChooseFromMedia = ({
  children,
  variant = "tertiary",
  size,
  disabled,
  className,
  "aria-describedby": describedBy,
  ...picker
}: ChooseFromMediaProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
      >
        <Images size={16} aria-hidden />
        {children}
      </Button>
      <MediaPicker open={open} onOpenChange={setOpen} {...picker} />
    </>
  );
};
