"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useWatch } from "react-hook-form";
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
import {
  mediaImageProps,
  optionalMediaUrl,
} from "~/modules/media/utils/media-url";

const FORM_ID = "about-form";

/** The about page's editor: the header, the sections and Save in the bottom bar. */
const AboutForm = ({ site }: { site: SiteRow }) => {
  const { run, isPending } = useAction();
  // Save waits for a photo that's still going up
  const [isUploading, setIsUploading] = useState(false);
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
      currentlyName: site.currently_name ?? "",
      currentlySince: site.currently_since ?? "",
      currentlyBlurb: site.currently_blurb ?? "",
      currentlyUrl: site.currently_url ?? "",
    },
  });

  // The photo has no input of its own: uploads and Remove set it directly
  const image = useWatch({ control, name: "image" });
  const imageUrl = optionalMediaUrl(image);
  const setImage = (path: string | null) =>
    setValue("image", path, { shouldDirty: true, shouldValidate: true });

  // Leaving the page would drop unsaved changes, so it asks first
  useUnsavedWarning(isDirty);

  // Uploaded or picked from Media. A photo that's replaced stays in Media
  const uploadButton = (
    <>
      <UploadButton
        folder="about"
        accept="image/*"
        onUploaded={(media) => setImage(media.path)}
        onUploadingChange={setIsUploading}
        onError={(message) => toast.error(message)}
      >
        {image ? "Replace photo" : "Upload photo"}
      </UploadButton>
      <ChooseFromMedia
        title="Choose a photo from Media"
        accept="image"
        pickLabel={() => "Use photo"}
        onPick={([media]) => setImage(media.path)}
      >
        Choose from Media
      </ChooseFromMedia>
    </>
  );

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
        description="The about modal on the home page: the headline, the intro, your photo and the Currently card."
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

        <FormSection
          title="Photo"
          description="Shown in the about modal and on the home page widget, cropped to 16:9."
        >
          {imageUrl ? (
            <>
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-neutral-950/10 bg-neutral-100">
                <Image
                  src={imageUrl}
                  {...mediaImageProps(imageUrl)}
                  alt="The about photo"
                  fill
                  sizes="(min-width: 640px) 448px, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadButton}
                {/* Only leaves the form until Save, so it isn't a delete */}
                <Button variant="ghost" onClick={() => setImage(null)}>
                  <X size={16} aria-hidden />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <UploadArea hint="No photo yet." hasError={!!errors.image}>
              {uploadButton}
            </UploadArea>
          )}
          {/* The preview already shows it, which could pass for saved */}
          {dirtyFields.image && (
            <Input.Hint>
              {image
                ? "The new photo shows on the site after you save."
                : "The photo leaves the site after you save."}
            </Input.Hint>
          )}
          <Input.Error error={errors.image} />
        </FormSection>

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
        isDisabled={isUploading}
      />
    </Page>
  );
};

export default AboutForm;
