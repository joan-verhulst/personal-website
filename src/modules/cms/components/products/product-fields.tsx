"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { Controller, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import Button from "~/modules/cms/components/button";
import Input from "~/modules/cms/components/input";
import { MediaTypeBadge } from "~/modules/cms/components/item-card";
import { ChooseFromMedia } from "~/modules/cms/components/media-picker";
import MediaThumb from "~/modules/cms/components/media-thumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import Switch from "~/modules/cms/components/primitives/switch";
import { PRODUCTS_FOLDER } from "~/modules/cms/components/products/config";
import {
  type ProductValues,
  productSchema,
} from "~/modules/cms/components/products/schema";
import UploadArea from "~/modules/cms/components/upload-area";
import UploadButton from "~/modules/cms/components/upload-button";
import { useForm } from "~/modules/cms/hooks/use-form";
import type { UploadedMedia } from "~/modules/cms/utils/upload-media";
import { WALL_BACKGROUNDS } from "~/modules/content/types";
import type { ProductRow } from "~/modules/content/utils/rows";
import { optionalMediaUrl } from "~/modules/media/utils/media-url";
import { TagLogo } from "~/modules/ui-ux/components/wall-tag";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";

export const emptyProduct: ProductValues = {
  name: "",
  logo: null,
  description: "",
  linkLabel: "",
  linkHref: "",
  mediaType: "image",
  media: "",
  width: 0,
  height: 0,
  background: "neutral",
  bare: false,
};

export const productValuesFrom = (row: ProductRow): ProductValues => ({
  name: row.name,
  logo: row.logo,
  description: row.description ?? "",
  linkLabel: row.link_label ?? "",
  linkHref: row.link_href ?? "",
  mediaType: row.media_type,
  // Empty when its file was deleted from Media, which asks for another
  media: row.media ?? "",
  width: row.width,
  height: row.height,
  background: row.background,
  bare: row.bare,
});

/** The form both the new product dialog and the edit dialog fill in. */
export const useProductForm = (defaultValues: ProductValues) =>
  useForm({ schema: productSchema, defaultValues });

type ProductForm = ReturnType<typeof useProductForm>;

/**
 * For handleSubmit's second argument. The media has no input to focus, so
 * without a toast pressing the button would seem to do nothing. The other
 * fields get focus, which says enough.
 */
export const reportInvalid = (errors: FieldErrors<ProductValues>) => {
  if (errors.media || errors.mediaType || errors.width || errors.height) {
    toast.error(errors.media?.message ?? "Upload the media again.");
  }
};

const describeMedia = (
  values: Pick<ProductValues, "mediaType" | "width" | "height">,
) =>
  `${values.mediaType === "video" ? "Video" : "Image"}, ${values.width}×${values.height}`;

interface FieldsProps {
  form: ProductForm;
  // Keeps ids unique when two product forms share a page
  idPrefix: string;
  /** True in the edit dialog, where a new file only counts once it's saved. */
  isSaved?: boolean;
  /** True while a file goes up, so the dialog can wait for it. */
  onUploadingChange: (isUploading: boolean) => void;
}

/**
 * Everything about a product, stacked: what it is and how to try it, then
 * the media and how its card looks. Files are uploaded or picked from Media
 * into the form, and a file that was replaced stays in Media.
 */
export const ProductFields = ({
  form,
  idPrefix,
  isSaved,
  onUploadingChange,
}: FieldsProps) => {
  const {
    control,
    register,
    errors,
    setValue,
    watch,
    formState: { dirtyFields },
  } = form;
  const [name, logo, media, mediaType, width, height, background] = watch([
    "name",
    "logo",
    "media",
    "mediaType",
    "width",
    "height",
    "background",
  ]);
  const logoUrl = optionalMediaUrl(logo);
  // The logo and the media can go up at the same time, so the dialog waits
  // until both are done
  const uploads = useRef(0);

  const trackUpload = (isUploading: boolean) => {
    uploads.current += isUploading ? 1 : -1;
    onUploadingChange(uploads.current > 0);
  };

  // Revalidates, so an "upload first" error clears once there's media
  const handleMedia = (file: UploadedMedia) => {
    const options = { shouldDirty: true, shouldValidate: true };
    setValue("mediaType", file.type, options);
    setValue("width", file.width, options);
    setValue("height", file.height, options);
    setValue("media", file.path, options);
  };

  const handleLogo = (file: UploadedMedia | null) =>
    setValue("logo", file?.path ?? null, {
      shouldDirty: true,
      shouldValidate: true,
    });

  const mediaButtons = (
    <>
      <UploadButton
        folder={PRODUCTS_FOLDER}
        accept="image/*,video/mp4,video/webm"
        maxSize={3200}
        aria-describedby={`${idPrefix}-media-hint`}
        onUploaded={handleMedia}
        onUploadingChange={trackUpload}
        onError={(message) => toast.error(message)}
      >
        {media ? "Replace" : "Upload"}
      </UploadButton>
      <ChooseFromMedia
        title="Choose from Media"
        accept="any"
        pickLabel={() => "Use file"}
        onPick={([file]) => handleMedia(file)}
        aria-describedby={`${idPrefix}-media-hint`}
      >
        Choose from Media
      </ChooseFromMedia>
    </>
  );

  return (
    <>
      <Input.Root error={errors.name}>
        <Input.Label htmlFor={`${idPrefix}-name`}>Name</Input.Label>
        <Input.Field id={`${idPrefix}-name`} {...register("name")} />
        <Input.Error error={errors.name} />
      </Input.Root>

      <Input.Root error={errors.logo}>
        <Input.Label as="span">
          Logo
          <Input.Optional />
        </Input.Label>
        <span className="flex flex-wrap items-center gap-2">
          {logoUrl && (
            // Tinted like the site does it, so a white logo shows too
            <span className="grid size-8.25 place-items-center rounded-[10px] border border-neutral-950/10 text-neutral-950">
              <TagLogo logo={logoUrl} className="size-4.5" />
            </span>
          )}
          <UploadButton
            folder={PRODUCTS_FOLDER}
            accept="image/svg+xml"
            aria-describedby={`${idPrefix}-logo-hint`}
            onUploaded={handleLogo}
            onUploadingChange={trackUpload}
            onError={(message) => toast.error(message)}
          >
            {logo ? "Replace" : "Upload SVG"}
          </UploadButton>
          <ChooseFromMedia
            title="Choose a logo from Media"
            accept="svg"
            pickLabel={() => "Use logo"}
            onPick={([file]) => handleLogo(file)}
            aria-describedby={`${idPrefix}-logo-hint`}
          >
            Choose from Media
          </ChooseFromMedia>
          {logo && (
            <Button variant="ghost" onClick={() => handleLogo(null)}>
              <X size={16} aria-hidden />
              Remove
            </Button>
          )}
        </span>
        <Input.Hint id={`${idPrefix}-logo-hint`}>
          A single color SVG, tinted like the name next to it.
          {/* Replace only changes the form, like the media below */}
          {isSaved && dirtyFields.logo && " Save to keep the change."}
        </Input.Hint>
        <Input.Error error={errors.logo} />
      </Input.Root>

      <Input.Root error={errors.description}>
        <Input.Label htmlFor={`${idPrefix}-description`}>
          Description
          <Input.Optional />
        </Input.Label>
        <Input.Textarea
          id={`${idPrefix}-description`}
          rows={3}
          {...register("description")}
        />
        <Input.Hint>What it is, and why to try it.</Input.Hint>
        <Input.Error error={errors.description} />
      </Input.Root>

      <Input.Root error={errors.linkLabel}>
        <Input.Label htmlFor={`${idPrefix}-link-label`}>
          Button label
          <Input.Optional />
        </Input.Label>
        <Input.Field
          id={`${idPrefix}-link-label`}
          // What the site says when it's left empty
          placeholder={`Try ${name.trim() || "it"}`}
          {...register("linkLabel")}
        />
        <Input.Error error={errors.linkLabel} />
      </Input.Root>

      <Input.Root error={errors.linkHref}>
        <Input.Label htmlFor={`${idPrefix}-link-href`}>
          Button link
          <Input.Optional />
        </Input.Label>
        <Input.Field
          id={`${idPrefix}-link-href`}
          type="url"
          placeholder="https://"
          {...register("linkHref")}
        />
        <Input.Hint>Where people try it. Without one there's no button.</Input.Hint>
        <Input.Error error={errors.linkHref} />
      </Input.Root>

      <Input.Root error={errors.media}>
        <Input.Label as="span">Media</Input.Label>
        {media ? (
          <>
            <span className="relative block w-40">
              <MediaThumb
                item={{ media, media_type: mediaType, background }}
                sizes="160px"
                className="w-full"
              />
              <MediaTypeBadge type={mediaType} />
            </span>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="font-medium text-neutral-950 text-xs tabular-nums">
                {describeMedia({ mediaType, width, height })}
              </p>
              <div className="flex flex-wrap gap-2">{mediaButtons}</div>
            </div>
            <Input.Hint id={`${idPrefix}-media-hint`}>
              A screenshot or a short screen recording.
              {/* Replace only changes the form here, unlike a record's cover */}
              {isSaved && dirtyFields.media && " Save to keep the new media."}
            </Input.Hint>
          </>
        ) : (
          <UploadArea
            hasError={!!errors.media}
            hintId={`${idPrefix}-media-hint`}
            hint={
              isSaved
                ? "Its file was deleted from Media, so the product is off the site. Upload or pick another, then save."
                : "A screenshot or a short screen recording: images, MP4 or WebM."
            }
          >
            {mediaButtons}
          </UploadArea>
        )}
        {/* The type and size come with the file, so their errors belong here too */}
        <Input.Error
          error={errors.media ?? errors.mediaType ?? errors.width ?? errors.height}
        />
      </Input.Root>

      <Input.Root error={errors.background}>
        <Input.Label htmlFor={`${idPrefix}-background`}>Background</Input.Label>
        <Controller
          control={control}
          name="background"
          render={({ field }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <Input.SelectField
                id={`${idPrefix}-background`}
                ref={field.ref}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </Input.SelectField>
              <SelectContent>
                {WALL_BACKGROUNDS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span
                      aria-hidden
                      className="mr-2 inline-block size-3.5 rounded-full border border-neutral-950/10 align-middle"
                      style={{ background: wallBackgrounds[option] }}
                    />
                    <span className="capitalize">{option}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Input.Hint>
          Behind the media on its card. Pick the one closest to the media's own
          accent color.
        </Input.Hint>
        <Input.Error error={errors.background} />
      </Input.Root>

      <div className="flex items-start gap-3 rounded-xl border border-neutral-950/10 p-3">
        <Controller
          control={control}
          name="bare"
          render={({ field }) => (
            <Switch
              id={`${idPrefix}-bare`}
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              aria-describedby={`${idPrefix}-bare-hint`}
              className="mt-0.5"
            />
          )}
        />
        <div className="flex flex-col gap-1">
          <Input.Label htmlFor={`${idPrefix}-bare`}>
            Fill the card, no frame
          </Input.Label>
          <Input.Hint id={`${idPrefix}-bare-hint`}>
            For reels that bring their own background. Export them at 4:3,
            like a bare UI/UX item.
          </Input.Hint>
        </div>
      </div>
    </>
  );
};
