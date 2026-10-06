"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { deleteWallTag, saveWallTag } from "~/modules/cms/actions/wall";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import EmptyState from "~/modules/cms/components/empty-state";
import FormDialog from "~/modules/cms/components/form-dialog";
import Header from "~/modules/cms/components/header";
import Input from "~/modules/cms/components/input";
import { TagDot } from "~/modules/cms/components/item-card";
import { CardMenu } from "~/modules/cms/components/media-card";
import { ChooseFromMedia } from "~/modules/cms/components/media-picker";
import { panelClass } from "~/modules/cms/components/panel";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/modules/cms/components/primitives/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/modules/cms/components/primitives/tooltip";
import PageActions from "~/modules/cms/components/shell/page-actions";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { wallTagSchema } from "~/modules/cms/schema/wall";
import type { WallTagRow } from "~/modules/content/utils/rows";
import { optionalMediaUrl } from "~/modules/media/utils/media-url";
import WallTag from "~/modules/ui-ux/components/wall-tag";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";

const DEFAULT_COLOR = "#525252";
const HEX = /^#[0-9a-f]{6}$/i;

const usedBy = (usage: number) => `${usage} item${usage === 1 ? "" : "s"}`;

/** A single color logo, tinted like the site does it. */
const TagLogo = ({ logo, color }: { logo: string; color: string }) => (
  <span
    aria-hidden
    className="h-3.5 w-4 shrink-0"
    style={{
      backgroundColor: color,
      maskImage: `url(${logo})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
    }}
  />
);

/** Deleting asks first, from a row's menu and from the edit dialog alike. */
const useDeleteTag = (tag: WallTagRow | null, usage: number) => {
  const confirm = useConfirm();
  const router = useRouter();
  const { href } = useAdminPath();
  const { run, isPending } = useAction();

  // Resolves to whether the tag is gone
  const deleteTag = async () => {
    if (!tag) return false;

    // The database refuses a tag that items still have, so this doesn't
    // offer a delete that can only fail
    if (usage) {
      const wantsItems = await confirm({
        title: "This tag is in use",
        description: `${usedBy(usage)} ${usage === 1 ? "uses" : "use"} it. Give ${usage === 1 ? "it" : "them"} another tag first.`,
        confirmLabel: "Show items",
        cancelLabel: "Close",
      });
      if (wantsItems) router.push(href("/admin/ui-ux/items"));
      return false;
    }

    const isConfirmed = await confirm({
      title: `Delete "${tag.label}"?`,
      description: "No items use it, so nothing else changes.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!isConfirmed) return false;
    const result = await run(() => deleteWallTag(tag.id), "Tag deleted");
    return !!result && !result.error;
  };

  return { deleteTag, isPending };
};

// ── The create and edit dialog ───────────────────────────────────────────────

interface TagDialogProps {
  // Null creates a new tag
  tag: WallTagRow | null;
  // How many items use the tag
  usage: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TagDialog = ({ tag, usage, open, onOpenChange }: TagDialogProps) => {
  const formId = useId();
  const { run, isPending } = useAction();
  const remove = useDeleteTag(tag, usage);
  // Save waits for a logo that's still going up
  const [isUploading, setIsUploading] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    errors,
    setErrors,
    setValue,
    watch,
    formState: { isDirty, dirtyFields },
  } = useForm({
    schema: wallTagSchema,
    defaultValues: {
      label: tag?.label ?? "",
      color: tag?.color ?? DEFAULT_COLOR,
      logo: tag?.logo ?? null,
    },
  });

  const [label, color, logo] = watch(["label", "color", "logo"]);
  const logoUrl = optionalMediaUrl(logo);
  const previewColor = HEX.test(color) ? color : DEFAULT_COLOR;
  const previewTag = { label: label.trim() || "Tag", color, logo: logoUrl };

  const onSubmit = handleSubmit(async (input) => {
    const result = await run(
      () => saveWallTag(tag?.id ?? null, input),
      tag ? "Tag saved" : "Tag added",
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    else if (result && !result.error) onOpenChange(false);
  });

  const handleOpenChange = (isOpen: boolean) => {
    // Closing mid-delete would hide how it went
    if (!isOpen && remove.isPending) return;
    onOpenChange(isOpen);
  };

  const handleDelete = async () => {
    if (await remove.deleteTag()) onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={tag ? "Edit tag" : "New tag"}
      description="The label on each card: usually the client or project."
      formId={formId}
      submitLabel={tag ? "Save" : "Add tag"}
      isPending={isPending}
      isDirty={isDirty}
      isSubmitDisabled={
        remove.isPending || isUploading || (tag ? !isDirty : !label.trim())
      }
      footerStart={
        tag && (
          <Button
            variant="danger"
            isPending={remove.isPending}
            disabled={isPending}
            onClick={handleDelete}
          >
            {/* The spinner takes over from the icon while it deletes */}
            {!remove.isPending && <Trash2 size={16} aria-hidden />}
            Delete
          </Button>
        )
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <Input.Root error={errors.label}>
          <Input.Label htmlFor={`${formId}-label`}>Label</Input.Label>
          <Input.Field
            id={`${formId}-label`}
            placeholder="Client or project name"
            {...register("label")}
          />
          <Input.Error error={errors.label} />
        </Input.Root>

        <Input.Root error={errors.color}>
          <Input.Label htmlFor={`${formId}-color`}>Color</Input.Label>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <span className="flex gap-2">
                <input
                  type="color"
                  aria-label="Pick a color"
                  // The picker only takes a full hex, so it holds still while one is typed
                  value={previewColor}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="h-[35px] w-12 shrink-0 cursor-pointer rounded-xl border border-neutral-950/10 bg-white p-1 focus-visible:outline-2 focus-visible:outline-primary-500"
                />
                <Input.Field
                  id={`${formId}-color`}
                  ref={field.ref}
                  className="w-32 tabular-nums"
                  spellCheck={false}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </span>
            )}
          />
          <Input.Hint>Readable on light grey, it's also the logo's tint.</Input.Hint>
          <Input.Error error={errors.color} />
        </Input.Root>

        <Input.Root error={errors.logo}>
          <Input.Label as="span">
            Logo
            <Input.Optional />
          </Input.Label>
          <span className="flex flex-wrap items-center gap-2">
            {logoUrl && (
              <span className="grid size-[33px] place-items-center rounded-[10px] border border-neutral-950/10">
                <Image
                  src={logoUrl}
                  alt=""
                  width={18}
                  height={18}
                  unoptimized
                  className="size-[18px]"
                />
              </span>
            )}
            <UploadButton
              folder="icons"
              accept="image/svg+xml"
              onUploaded={(media) =>
                setValue("logo", media.path, { shouldDirty: true })
              }
              onUploadingChange={setIsUploading}
              onError={(message) => toast.error(message)}
            >
              {logo ? "Replace" : "Upload SVG"}
            </UploadButton>
            <ChooseFromMedia
              title="Choose a logo from Media"
              accept="svg"
              pickLabel={() => "Use logo"}
              onPick={([media]) =>
                setValue("logo", media.path, { shouldDirty: true })
              }
            >
              Choose from Media
            </ChooseFromMedia>
            {logo && (
              <Button
                variant="ghost"
                onClick={() => setValue("logo", null, { shouldDirty: true })}
              >
                <X size={16} aria-hidden />
                Remove
              </Button>
            )}
          </span>
          <Input.Hint>
            A single color SVG, tinted to the color above.
            {/* Replace only changes the form here, unlike in the other dialogs */}
            {tag && dirtyFields.logo && " Save to keep the change."}
          </Input.Hint>
          <Input.Error error={errors.logo} />
        </Input.Root>

        <Input.Root>
          <Input.Label as="span">Preview</Input.Label>
          {/* The two ways the wall shows a tag: on a colored card and on a light one */}
          <div className="grid grid-cols-1 gap-2">
            <div
              className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-xl px-3"
              style={{ background: wallBackgrounds.midnight }}
            >
              <WallTag
                tag={previewTag}
                className="bg-neutral-50"
                style={{ color: previewColor }}
              />
            </div>
            <div className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-950/10 bg-neutral-50 px-3">
              <WallTag
                tag={previewTag}
                className="text-neutral-50"
                style={{ backgroundColor: previewColor }}
              />
            </div>
          </div>
        </Input.Root>
      </form>
    </FormDialog>
  );
};

// ── The table ─────────────────────────────────────────────────────────────────

interface TagMenuProps {
  tag: WallTagRow;
  usage: number;
  onEdit: () => void;
}

const TagMenu = ({ tag, usage, onEdit }: TagMenuProps) => {
  const { deleteTag, isPending } = useDeleteTag(tag, usage);
  // Set by a menu item, acted on as the menu closes, so the dialog that
  // follows hands focus back to the ⋮ button
  const requested = useRef<"edit" | "delete" | null>(null);

  return (
    <CardMenu
      variant="ghost"
      label={`Actions for "${tag.label}"`}
      isPending={isPending}
      onCloseAutoFocus={() => {
        const action = requested.current;
        requested.current = null;
        if (action === "edit") onEdit();
        if (action === "delete") deleteTag();
      }}
    >
      <DropdownMenuItem
        onSelect={() => {
          requested.current = "edit";
        }}
      >
        <Pencil aria-hidden />
        Edit
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="danger"
        onSelect={() => {
          requested.current = "delete";
        }}
      >
        <Trash2 aria-hidden />
        Delete
      </DropdownMenuItem>
    </CardMenu>
  );
};

interface Props {
  tags: WallTagRow[];
  // How many items use each tag
  usage: Record<string, number>;
}

/** The tags page: its header, the table of tags and their dialog. */
const TagsEditor = ({ tags, usage }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  // A fresh key per opening, so the form starts from the tag's saved values
  const [editing, setEditing] = useState<{
    tag: WallTagRow | null;
    key: number;
  }>({ tag: null, key: 0 });

  const openDialog = (tag: WallTagRow | null) => {
    setEditing((current) => ({ tag, key: current.key + 1 }));
    setIsOpen(true);
  };

  const newTagButton = (
    <Button variant="primary" onClick={() => openDialog(null)}>
      New tag
      <Plus size={16} aria-hidden />
    </Button>
  );

  return (
    <>
      <Header
        title="Tags"
        description="The label on each card: usually the client or project. A logo is a single color SVG, tinted to the tag's color."
        actions={newTagButton}
      />

      {tags.length === 0 ? (
        <EmptyState title="No tags yet" action={newTagButton} />
      ) : (
        // The table is the page's one section, so it fills its container
        // edge to edge instead of sitting in a second box
        <div className={cn(panelClass, "overflow-hidden")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => {
                const logoUrl = optionalMediaUrl(tag.logo);
                const count = usage[tag.id] ?? 0;

                return (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDialog(tag)}
                        className="-mx-1 flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left hover:underline focus-visible:outline-2 focus-visible:outline-primary-500"
                      >
                        <TagDot color={tag.color} />
                        {logoUrl && <TagLogo logo={logoUrl} color={tag.color} />}
                        {tag.label}
                      </button>
                    </TableCell>
                    <TableCell className="text-neutral-700 tabular-nums">
                      {tag.color}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums",
                        !count && "font-normal text-neutral-600",
                      )}
                    >
                      {count}
                    </TableCell>
                    <TableCell className="text-right">
                      <TagMenu
                        tag={tag}
                        usage={count}
                        onEdit={() => openDialog(tag)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* The bar's round + adds what the page is about: here that's a tag */}
      <PageActions isCompact>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="primary"
              aria-label="New tag"
              onClick={() => openDialog(null)}
            >
              <Plus size={16} aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">New tag</TooltipContent>
        </Tooltip>
      </PageActions>

      <TagDialog
        key={editing.key}
        tag={editing.tag}
        usage={editing.tag ? (usage[editing.tag.id] ?? 0) : 0}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
};

export default TagsEditor;
