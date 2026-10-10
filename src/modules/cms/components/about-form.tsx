"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { type FieldError, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveAbout } from "~/modules/cms/actions/site";
import Button from "~/modules/cms/components/button";
import FormSection from "~/modules/cms/components/form-section";
import Header from "~/modules/cms/components/header";
import Input from "~/modules/cms/components/input";
import { ChooseFromMedia } from "~/modules/cms/components/media-picker";
import Page from "~/modules/cms/components/page";
import SaveActions from "~/modules/cms/components/shell/save-actions";
import UploadArea from "~/modules/cms/components/upload-area";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import { aboutSchema } from "~/modules/cms/schema/site";
import type { SiteRow } from "~/modules/content/utils/rows";
import { optionalMediaUrl } from "~/modules/media/utils/media-url";
import cn from "~/utils/cn";

const FORM_ID = "about-form";

interface PhotoSectionProps {
  title: string;
  description: string;
  /** The shape the site crops it to, as an aspect class. */
  aspect: string;
  path: string | null;
  isDirty?: boolean;
  error?: FieldError;
  onChange: (path: string | null) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

/** One of the about photos, set by an upload, a pick from Media or Remove. */
const PhotoSection = ({
  title,
  description,
  aspect,
  path,
  isDirty,
  error,
  onChange,
  onUploadingChange,
}: PhotoSectionProps) => {
  const url = optionalMediaUrl(path);

  // Uploaded or picked from Media. A photo that's replaced stays in Media
  const uploadButton = (
    <>
      <UploadButton
        folder="about"
        accept="image/*"
        onUploaded={(media) => onChange(media.path)}
        onUploadingChange={onUploadingChange}
        onError={(message) => toast.error(message)}
      >
        {path ? "Replace photo" : "Upload photo"}
      </UploadButton>
      <ChooseFromMedia
        title="Choose a photo from Media"
        accept="image"
        pickLabel={() => "Use photo"}
        onPick={([media]) => onChange(media.path)}
      >
        Choose from Media
      </ChooseFromMedia>
    </>
  );

  return (
    <FormSection title={title} description={description}>
      {url ? (
        <>
          <div
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-xl border border-neutral-950/10 bg-neutral-100",
              aspect,
            )}
          >
            <Image
              src={url}
              alt={title}
              fill
              sizes="(min-width: 640px) 448px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadButton}
            {/* Only leaves the form until Save, so it isn't a delete */}
            <Button variant="ghost" onClick={() => onChange(null)}>
              <X size={16} aria-hidden />
              Remove
            </Button>
          </div>
        </>
      ) : (
        <UploadArea hint="No photo yet." hasError={!!error}>
          {uploadButton}
        </UploadArea>
      )}
      {/* The preview already shows it, which could pass for saved */}
      {isDirty && (
        <Input.Hint>
          {path
            ? "The new photo shows on the site after you save."
            : "The photo leaves the site after you save."}
        </Input.Hint>
      )}
      <Input.Error error={error} />
    </FormSection>
  );
};

/** The about page's editor: the header, the sections and Save in the bottom bar. */
const AboutForm = ({ site }: { site: SiteRow }) => {
  const { run, isPending } = useAction();
  // Save waits for the photos that are still going up
  const [uploads, setUploads] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    errors,
    setErrors,
    formState: { isDirty, dirtyFields },
  } = useForm({
    schema: aboutSchema,
    defaultValues: {
      headline: site.about_headline,
      intro: site.about_intro,
      image: site.about_image,
      // Before 0008_about_modal_image.sql the modal shows the widget's photo
      modalImage:
        site.about_modal_image === undefined
          ? site.about_image
          : site.about_modal_image,
      currentlyName: site.currently_name ?? "",
      currentlySince: site.currently_since ?? "",
      currentlyBlurb: site.currently_blurb ?? "",
      currentlyUrl: site.currently_url ?? "",
    },
  });

  // The photos have no input of their own: uploads and Remove set them
  const [image, modalImage] = useWatch({
    control,
    name: ["image", "modalImage"],
  });
  const setPhoto =
    (name: "image" | "modalImage") => (path: string | null) =>
      setValue(name, path, { shouldDirty: true, shouldValidate: true });
  const onUploadingChange = (isUploading: boolean) =>
    setUploads((count) => count + (isUploading ? 1 : -1));

  // Leaving the page would drop unsaved changes, so it asks first
  useUnsavedWarning(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => saveAbout(values), "About saved");
    if (!result) return;
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      return;
    }
    // What was saved is the new starting point, so Save turns off again
    reset(values);
  });

  return (
    <Page width="form">
      <Header
        title="About"
        description="The about modal on the home page: the headline, the intro, your photos and the Currently card."
      />

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <FormSection
          title="Text"
          description="The big headline and the paragraph under it."
        >
          <Input.Root error={errors.headline}>
            <Input.Label htmlFor="headline">Headline</Input.Label>
            <Input.Textarea id="headline" {...register("headline")} />
            <Input.Hint>The big line at the top of the about modal.</Input.Hint>
            <Input.Error error={errors.headline} />
          </Input.Root>
          <Input.Root error={errors.intro}>
            <Input.Label htmlFor="intro">
              Intro
              <Input.Optional />
            </Input.Label>
            <Input.Textarea
              id="intro"
              className="min-h-28"
              {...register("intro")}
            />
            <Input.Error error={errors.intro} />
          </Input.Root>
        </FormSection>

        <PhotoSection
          title="Widget photo"
          description="On the About widget, in the island and in link previews, cropped to about 2:1. The footer shows it blurred."
          aspect="aspect-2/1"
          path={image}
          isDirty={dirtyFields.image}
          error={errors.image}
          onChange={setPhoto("image")}
          onUploadingChange={onUploadingChange}
        />

        <PhotoSection
          title="Modal photo"
          description="At the top of the about modal, cropped to 16:9."
          aspect="aspect-video"
          path={modalImage}
          isDirty={dirtyFields.modalImage}
          error={errors.modalImage}
          onChange={setPhoto("modalImage")}
          onUploadingChange={onUploadingChange}
        />

        <FormSection
          title="Currently"
          description="The card at the bottom of the modal. Leave the name empty to hide it."
        >
          <Input.Root error={errors.currentlyName}>
            <Input.Label htmlFor="currently-name">
              Name
              <Input.Optional />
            </Input.Label>
            <Input.Field id="currently-name" {...register("currentlyName")} />
            <Input.Error error={errors.currentlyName} />
          </Input.Root>
          <Input.Root error={errors.currentlySince}>
            <Input.Label htmlFor="currently-since">
              Since
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="currently-since"
              placeholder="Since 2023"
              {...register("currentlySince")}
            />
            <Input.Error error={errors.currentlySince} />
          </Input.Root>
          <Input.Root error={errors.currentlyBlurb}>
            <Input.Label htmlFor="currently-blurb">
              What you do there
              <Input.Optional />
            </Input.Label>
            <Input.Textarea
              id="currently-blurb"
              {...register("currentlyBlurb")}
            />
            <Input.Error error={errors.currentlyBlurb} />
          </Input.Root>
          <Input.Root error={errors.currentlyUrl}>
            <Input.Label htmlFor="currently-url">
              Link
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="currently-url"
              type="url"
              placeholder="https://"
              {...register("currentlyUrl")}
            />
            <Input.Error error={errors.currentlyUrl} />
          </Input.Root>
        </FormSection>
      </form>

      {/* In the bottom bar, outside the form, so Save reaches it through the
          form attribute */}
      <SaveActions
        formId={FORM_ID}
        isDirty={isDirty}
        isPending={isPending}
        isDisabled={uploads > 0}
      />
    </Page>
  );
};

export default AboutForm;
