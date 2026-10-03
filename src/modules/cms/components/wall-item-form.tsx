"use client";

import {
  Check,
  Image as ImageIcon,
  Tag as TagIcon,
  Trash2,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type Control,
  Controller,
  type FieldError,
  type UseFormRegisterReturn,
  type UseFormSetValue,
} from "react-hook-form";
import { toast } from "sonner";
import {
  deleteWallItem,
  discardWallUpload,
  saveWallItem,
} from "~/modules/cms/actions/wall";
import AdminLink from "~/modules/cms/components/admin-link";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import { Placeholder } from "~/modules/cms/components/empty-state";
import FormSection from "~/modules/cms/components/form-section";
import Header, { textLinkClass } from "~/modules/cms/components/header";
import Input, { useInputField } from "~/modules/cms/components/input";
import MediaThumb from "~/modules/cms/components/media-thumb";
import Page from "~/modules/cms/components/page";
import Panel from "~/modules/cms/components/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import Switch from "~/modules/cms/components/primitives/switch";
import SaveActions from "~/modules/cms/components/shell/save-actions";
import UploadArea from "~/modules/cms/components/upload-area";
import UploadButton from "~/modules/cms/components/upload-button";
import WallCardPreview from "~/modules/cms/components/wall/wall-card-preview";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import {
  type WallItemOutput,
  type WallItemValues,
  wallItemSchema,
} from "~/modules/cms/schema/wall";
import type { UploadedMedia } from "~/modules/cms/utils/upload-media";
import {
  hiddenUsage,
  liveUsage,
  toPreviewItem,
} from "~/modules/cms/utils/wall-preview";
import { WALL_BACKGROUNDS } from "~/modules/content/types";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";

const FORM_ID = "wall-item-form";

const fromRow = (row: WallItemRow): WallItemValues => ({
  title: row.title,
  tagId: row.tag_id,
  mediaType: row.media_type,
  media: row.media,
  width: row.width,
  height: row.height,
  background: row.background,
  bare: row.bare,
  position: row.object_position ?? "",
  zoom: row.zoom,
  description: row.description ?? "",
  linkLabel: row.link_label ?? "",
  linkHref: row.link_href ?? "",
});

/** What the new item page starts with. */
const emptyWallItem = (tags: WallTagRow[]): WallItemValues => ({
  title: "",
  tagId: tags[0]?.id ?? "",
  mediaType: "image",
  media: "",
  width: 0,
  height: 0,
  background: "neutral",
  bare: false,
  position: "",
  zoom: null,
  description: "",
  linkLabel: "",
  linkHref: "",
});

const describeMedia = (
  values: Pick<WallItemValues, "mediaType" | "width" | "height">,
) =>
  `${values.mediaType === "video" ? "Video" : "Image"}, ${values.width}×${values.height}`;

/**
 * What deleting an item does, for the confirm dialog. The server takes it
 * off the wall and the lists itself.
 */
export const describeDelete = (usage: string[]) => {
  if (!usage.length) return "It's not on the site, so nothing else changes.";
  const places = [...liveUsage(usage), ...hiddenUsage(usage)];
  const isOnWall = places.some((place) => place.startsWith("Row "));
  const wallNote = isOnWall
    ? " Its slot on the wall is left empty, which hides that row until it's filled."
    : "";
  return `It's used in: ${places.join(", ")}, and comes off there too.${wallNote}`;
};

/** Removes an upload no item ended up using. A failure only leaves clutter. */
const discardUpload = (path: string) => {
  if (path) discardWallUpload(path).catch(() => undefined);
};

// ── Fields ────────────────────────────────────────────────────────────────────

type WallItemControl = Control<WallItemValues, unknown, WallItemOutput>;

interface MediaUploadButtonProps {
  hasMedia: boolean;
  setValue: UseFormSetValue<WallItemValues>;
  /**
   * Runs before the form takes a new upload, while it still holds the old
   * media. Returning false drops the upload, like when the page was left.
   */
  onBeforeUse: (media: UploadedMedia) => boolean;
  /** True while a file goes up, so Save can wait for it. */
  onUploadingChange: (isUploading: boolean) => void;
}

/** Uploads a screenshot or reel and fills in its type and size. */
const MediaUploadButton = ({
  hasMedia,
  setValue,
  onBeforeUse,
  onUploadingChange,
}: MediaUploadButtonProps) => {
  // Revalidates, so an "upload first" error clears once there's media
  const handleUploaded = (media: UploadedMedia) => {
    if (!onBeforeUse(media)) return;
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("mediaType", media.type, options);
    setValue("width", media.width, options);
    setValue("height", media.height, options);
    setValue("media", media.path, options);
  };

  return (
    <UploadButton
      folder="work"
      accept="image/*,video/mp4,video/webm"
      maxSize={3200}
      onUploaded={handleUploaded}
      onUploadingChange={onUploadingChange}
      onError={(message) => toast.error(message)}
    >
      {hasMedia ? "Replace" : "Upload"}
    </UploadButton>
  );
};

interface TagSelectProps {
  control: WallItemControl;
  tags: WallTagRow[];
  error?: FieldError;
  id: string;
}

const TagSelect = ({ control, tags, error, id }: TagSelectProps) => (
  <Input.Root error={error}>
    <Input.Label htmlFor={id}>Tag</Input.Label>
    <Controller
      control={control}
      name="tagId"
      render={({ field }) => (
        <Select
          name={field.name}
          // An empty value would throw, undefined shows the placeholder
          value={field.value || undefined}
          onValueChange={field.onChange}
          disabled={tags.length === 0}
        >
          <Input.SelectField id={id} ref={field.ref} onBlur={field.onBlur}>
            <SelectValue
              placeholder={tags.length ? "Pick a tag" : "Add a tag first"}
            />
          </Input.SelectField>
          <SelectContent>
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
      )}
    />
    <Input.Hint>
      <AdminLink
        href="/admin/ui-ux/tags"
        className="rounded-sm underline underline-offset-2 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        Manage tags
      </AdminLink>
    </Input.Hint>
    <Input.Error error={error} />
  </Input.Root>
);

interface BackgroundPickerProps {
  /** register("background"), spread on every radio. */
  registration: UseFormRegisterReturn<"background">;
  error?: FieldError;
}

/** The swatches themselves. Inside the field, so they know its hint. */
const BackgroundSwatches = ({
  registration,
}: Pick<BackgroundPickerProps, "registration">) => {
  const { "aria-describedby": describedBy } = useInputField();

  return (
    <fieldset aria-describedby={describedBy} className="flex flex-col gap-1.5">
      <Input.Label as="legend" className="mb-1.5">
        Background
      </Input.Label>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6">
        {WALL_BACKGROUNDS.map((background) => (
          <label
            key={background}
            className="group/swatch flex min-w-0 cursor-pointer flex-col items-center gap-1.5"
          >
            <input
              type="radio"
              value={background}
              {...registration}
              className="peer sr-only"
            />
            <span
              className="grid aspect-4/3 w-full place-items-center rounded-lg border border-neutral-950/10 transition-[border-color,box-shadow] group-hover/swatch:border-neutral-950/25 peer-checked:border-transparent peer-checked:ring-2 peer-checked:ring-primary-500 peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-primary-500 peer-focus-visible:outline-offset-4"
              style={{ background: wallBackgrounds[background] }}
            >
              <span className="hidden size-5 place-items-center rounded-full bg-white text-primary-500 shadow-sm group-has-checked/swatch:grid">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
            </span>
            <span className="max-w-full truncate text-neutral-600 text-xs capitalize group-has-checked/swatch:font-medium group-has-checked/swatch:text-neutral-950">
              {background}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

/**
 * The card backgrounds as swatches, six in a row. They're native radios, so
 * Tab lands on the chosen one and the arrow keys move the choice.
 */
const BackgroundPicker = ({ registration, error }: BackgroundPickerProps) => (
  <Input.Root error={error}>
    <BackgroundSwatches registration={registration} />
    <Input.Hint>
      Pick the one closest to the media's own accent color.
    </Input.Hint>
    <Input.Error error={error} />
  </Input.Root>
);

// ── The page ──────────────────────────────────────────────────────────────────

interface Props {
  /** The item to edit. Without one this is the new item page. */
  item?: WallItemRow;
  tags: WallTagRow[];
  /** Where the item is used, so deleting can warn. */
  usage?: string[];
  /** For a new item: "experiments" also puts it at the end of that list. */
  list?: "experiments";
}

/**
 * The whole page of a wall item, for a new one and for editing: its header,
 * the live preview and the fields, stacked in that order. Save and Delete sit
 * in the bottom bar. Saving a new item creates it and carries on at its own
 * edit page.
 */
const WallItemForm = ({ item, tags, usage = [], list }: Props) => {
  const router = useRouter();
  const { href } = useAdminPath();
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Separate, so a delete doesn't spin the Save button
  const remove = useAction();
  const [isUploading, setIsUploading] = useState(false);
  // A new item that's saved, while its own page loads
  const [isCreated, setIsCreated] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    errors,
    setErrors,
    setValue,
    watch,
    reset,
    formState: { isDirty, dirtyFields },
  } = useForm({
    schema: wallItemSchema,
    defaultValues: item ? fromRow(item) : emptyWallItem(tags),
  });

  // The upload this form holds that no save has kept yet
  const unsavedUpload = useRef("");
  const isMounted = useRef(false);

  // Leaving without saving would strand that upload in storage. The server
  // refuses to remove a file an item uses, so saved media is never at risk
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      discardUpload(unsavedUpload.current);
      unsavedUpload.current = "";
    };
  }, []);

  const handleBeforeUse = (upload: UploadedMedia) => {
    // The page was left while the file went up, so nothing will use it
    if (!isMounted.current) {
      discardUpload(upload.path);
      return false;
    }
    // A second upload before saving makes the first one unused
    discardUpload(unsavedUpload.current);
    unsavedUpload.current = upload.path;
    return true;
  };

  // Leaving the page would drop unsaved changes, so it asks first
  useUnsavedWarning(isDirty);

  const values = watch();
  const preview = toPreviewItem(
    {
      id: item?.id ?? "new",
      title: values.title,
      tag_id: values.tagId,
      media_type: values.mediaType,
      media: values.media,
      width: values.width,
      height: values.height,
      background: values.background,
      bare: values.bare,
      object_position: values.position || null,
      zoom: values.zoom || null,
      description: values.description || null,
      link_label: values.linkLabel || null,
      link_href: values.linkHref || null,
    },
    tags,
  );
  const tag = tags.find(({ id }) => id === item?.tag_id);

  const onSubmit = handleSubmit(
    async (input) => {
      if (!item) {
        // A failed add to Experiments still creates the item, so the toast
        // doesn't promise more than that
        const result = await run(
          () => saveWallItem(null, input, list),
          "Item added",
        );
        if (result?.fieldErrors) {
          setErrors(result.fieldErrors);
          return;
        }
        if (!result?.id) return;
        if (result.listError) toast.error(result.listError);
        unsavedUpload.current = "";
        // Turns Save off, so a second click can't create the item twice
        setIsCreated(true);
        // Nothing is unsaved any more, so leaving doesn't ask
        reset(input);
        // Replaces the new page, so Back from the item goes to the items.
        // An item made for Experiments remembers that, so the way back
        // opens the tab it's on
        router.replace(
          href(`/admin/ui-ux/items/${result.id}${list ? `?from=${list}` : ""}`),
        );
        return;
      }

      const result = await run(() => saveWallItem(item.id, input), "Item saved");
      if (result?.fieldErrors) setErrors(result.fieldErrors);
      else if (result && !result.error) {
        unsavedUpload.current = "";
        // What was saved is the new starting point, so Save turns off again
        reset(input);
      }
    },
    // The media fields have no input to focus, so without a toast clicking
    // the button would seem to do nothing
    (fieldErrors) => {
      const isMediaError =
        fieldErrors.media ||
        fieldErrors.mediaType ||
        fieldErrors.width ||
        fieldErrors.height;
      toast.error(
        isMediaError
          ? (fieldErrors.media?.message ?? "Upload the media again.")
          : "Check the highlighted fields.",
      );
    },
  );

  const handleDelete = async () => {
    if (!item) return;
    const isConfirmed = await confirm({
      title: `Delete "${item.title}"?`,
      description: describeDelete(usage),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!isConfirmed) return;
    // The action sends the browser back to the items itself
    await remove.run(() => deleteWallItem(item.id, true), "Item deleted");
  };

  const live = liveUsage(usage);
  const hidden = hiddenUsage(usage);

  return (
    <Page width="form">
      {item ? (
        <Header
          title={item.title}
          description={
            live.length
              ? `On the site in: ${live.join(", ")}.`
              : hidden.length
                ? `Not on the site yet: ${hidden.join(" and ")} ${hidden.length === 1 ? "has" : "have"} an empty slot, so the site skips ${hidden.length === 1 ? "it" : "them"}.`
                : (
                    <>
                      Not on the site yet. Place it in a row on the{" "}
                      <AdminLink
                        href="/admin/ui-ux"
                        className={textLinkClass}
                      >
                        Wall
                      </AdminLink>
                      , or in Experiments, to show it.
                    </>
                  )
          }
          meta={
            <>
              <span className="flex items-center gap-1.5">
                {item.media_type === "video" ? (
                  <Video aria-hidden />
                ) : (
                  <ImageIcon aria-hidden />
                )}
                {describeMedia({
                  mediaType: item.media_type,
                  width: item.width,
                  height: item.height,
                })}
              </span>
              {tag && (
                <span className="flex items-center gap-1.5">
                  <TagIcon aria-hidden />
                  {tag.label}
                </span>
              )}
            </>
          }
        />
      ) : (
        <Header
          title="New item"
          description={
            list === "experiments"
              ? "A screenshot or a reel. It goes at the end of Experiments."
              : "A screenshot or a reel. Place it in a row on the Wall afterwards to show it on the site."
          }
        />
      )}

      <Panel
        title="Preview"
        description="How the card looks on the wall, with the changes you haven't saved yet."
      >
        {values.media ? (
          <WallCardPreview item={preview} />
        ) : (
          <Placeholder>Upload media to see the card.</Placeholder>
        )}
      </Panel>

      <form
        id={FORM_ID}
        noValidate
        onSubmit={onSubmit}
        className="flex min-w-0 flex-col gap-4"
      >
        <FormSection
          title="Media"
          description="A screenshot or a screen recording. Videos play on the wall, so keep them short."
        >
          {values.media ? (
            <>
              <MediaThumb
                item={{
                  media: values.media,
                  media_type: values.mediaType,
                  background: values.background,
                }}
                sizes="160px"
                className="w-40"
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="font-medium text-neutral-950 text-xs">
                  {describeMedia(values)}
                </p>
                <MediaUploadButton
                  hasMedia
                  setValue={setValue}
                  onBeforeUse={handleBeforeUse}
                  onUploadingChange={setIsUploading}
                />
              </div>
              {/* Replace only changes the form here, unlike in the dialogs */}
              {item && dirtyFields.media && (
                <Input.Hint>Save to keep the new media.</Input.Hint>
              )}
            </>
          ) : (
            <UploadArea hint="Images, MP4 or WebM" hasError={!!errors.media}>
              <MediaUploadButton
                hasMedia={false}
                setValue={setValue}
                onBeforeUse={handleBeforeUse}
                onUploadingChange={setIsUploading}
              />
            </UploadArea>
          )}
          <Input.Error error={errors.media} />
        </FormSection>

        <FormSection
          title="Card"
          description="How the item looks on the wall: its title, tag, background and crop."
        >
          <Input.Root error={errors.title}>
            <Input.Label htmlFor="title">Title</Input.Label>
            <Input.Field id="title" {...register("title")} />
            <Input.Error error={errors.title} />
          </Input.Root>
          <TagSelect
            id="tag"
            control={control}
            tags={tags}
            error={errors.tagId}
          />

          <BackgroundPicker
            registration={register("background")}
            error={errors.background}
          />

          <div className="flex items-start gap-3 rounded-xl border border-neutral-950/10 p-3">
            <Controller
              control={control}
              name="bare"
              render={({ field }) => (
                <Switch
                  id="bare"
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-describedby="bare-hint"
                  className="mt-0.5"
                />
              )}
            />
            <div className="flex flex-col gap-1">
              <Input.Label htmlFor="bare">Fill the card, no frame</Input.Label>
              <Input.Hint id="bare-hint">
                For reels with their own background. Export them at 4:3. The
                background then only picks the header: neutral for light reels.
              </Input.Hint>
            </div>
          </div>

          <Input.Root error={errors.position}>
            <Input.Label htmlFor="position">
              Crop position
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="position"
              placeholder="left top"
              {...register("position")}
            />
            <Input.Hint>
              Which part of the media stays in view, like "center top" or
              "50% 20%". Left empty it's "left top".
            </Input.Hint>
            <Input.Error error={errors.position} />
          </Input.Root>
          <Input.Root error={errors.zoom}>
            <Input.Label htmlFor="zoom">
              Zoom
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="zoom"
              type="number"
              step="0.05"
              min="1"
              max="10"
              placeholder="1"
              {...register("zoom", {
                // Empty means no zoom, not 0
                setValueAs: (value: unknown) =>
                  value === "" || value === null || value === undefined
                    ? null
                    : Number(value),
              })}
            />
            <Input.Hint>
              Scales the media up, e.g. to crop browser chrome out of a
              recording.
            </Input.Hint>
            <Input.Error error={errors.zoom} />
          </Input.Root>
        </FormSection>

        <FormSection
          title="Modal text"
          description="Shown when the card opens. It only opens when it has a description or a link."
        >
          <Input.Root error={errors.description}>
            <Input.Label htmlFor="description">
              Description
              <Input.Optional />
            </Input.Label>
            <Input.Textarea
              id="description"
              rows={3}
              {...register("description")}
            />
            <Input.Error error={errors.description} />
          </Input.Root>
          <Input.Root error={errors.linkLabel}>
            <Input.Label htmlFor="linkLabel">
              Link label
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="linkLabel"
              placeholder="Visit site"
              {...register("linkLabel")}
            />
            <Input.Error error={errors.linkLabel} />
          </Input.Root>
          <Input.Root error={errors.linkHref}>
            <Input.Label htmlFor="linkHref">
              Link
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="linkHref"
              type="url"
              placeholder="https://"
              {...register("linkHref")}
            />
            <Input.Error error={errors.linkHref} />
          </Input.Root>
        </FormSection>
      </form>

      {/* These land in the bottom bar, in place of its + button. They're
          outside the form there, so Save reaches it through the form
          attribute. Save waits for a file that's still going up, which would
          otherwise be left out of what's saved */}
      <SaveActions
        formId={FORM_ID}
        label={item ? "Save" : "Add item"}
        isDirty={isDirty}
        isPending={isPending}
        isDisabled={isUploading || remove.isPending || isCreated}
        // On the new page pressing it says what's still missing
        isAlwaysEnabled={!item}
        start={
          item && (
            <Button
              variant="danger"
              isPending={remove.isPending}
              disabled={isPending || isUploading}
              onClick={handleDelete}
            >
              {/* The spinner takes over from the icon while it deletes */}
              {!remove.isPending && <Trash2 size={16} aria-hidden />}
              Delete
            </Button>
          )
        }
      />
    </Page>
  );
};

export default WallItemForm;
