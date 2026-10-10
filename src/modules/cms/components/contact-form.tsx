"use client";

import { fallbackCards } from "~/data/contact-cards";
import { saveContact } from "~/modules/cms/actions/site";
import FormSection from "~/modules/cms/components/form-section";
import Header from "~/modules/cms/components/header";
import Input from "~/modules/cms/components/input";
import Page from "~/modules/cms/components/page";
import SaveActions from "~/modules/cms/components/shell/save-actions";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import { contactSchema } from "~/modules/cms/schema/site";
import type { SiteRow } from "~/modules/content/utils/rows";

const FORM_ID = "contact-form";

// The cards in the contact modal, in its order. Each also shows as a banner
// in its section's footer
const CARDS = [
  {
    key: "uiUx",
    title: "UI/UX card",
    description:
      "The first card in the contact modal, and the banner in the footer on home and UI/UX. Its button links out.",
  },
  {
    key: "photography",
    title: "Photography card",
    description:
      "The banner in the Photography footer too. Its button opens an email, with the title as its subject.",
  },
  {
    key: "digitalArt",
    title: "Digital art card",
    description:
      "The banner in the Digital Art footer too. Its button opens an email, with the title as its subject.",
  },
] as const;

/** The contact links' editor: the header, the sections and Save in the bottom bar. */
const ContactForm = ({ site }: { site: SiteRow }) => {
  const { run, isPending } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    errors,
    setErrors,
    formState: { isDirty },
  } = useForm({
    schema: contactSchema,
    defaultValues: {
      instagram: site.instagram_url ?? "",
      linkedin: site.linkedin_url ?? "",
      email: site.email ?? "",
      uiUxTitle: site.card_ui_ux_title ?? "",
      uiUxText: site.card_ui_ux_text ?? "",
      uiUxButton: site.card_ui_ux_button ?? "",
      uiUxUrl: site.card_ui_ux_url ?? "",
      photographyTitle: site.card_photography_title ?? "",
      photographyText: site.card_photography_text ?? "",
      photographyButton: site.card_photography_button ?? "",
      digitalArtTitle: site.card_digital_art_title ?? "",
      digitalArtText: site.card_digital_art_text ?? "",
      digitalArtButton: site.card_digital_art_button ?? "",
    },
  });

  // Leaving the page would drop unsaved changes, so it asks first
  useUnsavedWarning(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => saveContact(values), "Contact saved");
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
        title="Contact"
        description="The cards in the contact modal and the footer banners, and your links. Leave a link empty to hide its icon."
      />

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {CARDS.map(({ key, title, description }) => {
          const fallback = fallbackCards[key];
          return (
            <FormSection key={key} title={title} description={description}>
              <Input.Root error={errors[`${key}Title`]}>
                <Input.Label htmlFor={`${key}-title`}>
                  Title
                  <Input.Optional />
                </Input.Label>
                <Input.Field
                  id={`${key}-title`}
                  placeholder={fallback.title}
                  {...register(`${key}Title`)}
                />
                <Input.Error error={errors[`${key}Title`]} />
              </Input.Root>
              <Input.Root error={errors[`${key}Text`]}>
                <Input.Label htmlFor={`${key}-text`}>
                  Text
                  <Input.Optional />
                </Input.Label>
                <Input.Textarea
                  id={`${key}-text`}
                  placeholder={fallback.text}
                  {...register(`${key}Text`)}
                />
                <Input.Error error={errors[`${key}Text`]} />
              </Input.Root>
              <Input.Root error={errors[`${key}Button`]}>
                <Input.Label htmlFor={`${key}-button`}>
                  Button
                  <Input.Optional />
                </Input.Label>
                <Input.Field
                  id={`${key}-button`}
                  placeholder={fallback.button}
                  {...register(`${key}Button`)}
                />
                <Input.Error error={errors[`${key}Button`]} />
              </Input.Root>
              {key === "uiUx" && (
                <Input.Root error={errors.uiUxUrl}>
                  <Input.Label htmlFor="uiUx-url">
                    Button link
                    <Input.Optional />
                  </Input.Label>
                  <Input.Field
                    id="uiUx-url"
                    type="url"
                    placeholder={fallback.href}
                    {...register("uiUxUrl")}
                  />
                  <Input.Error error={errors.uiUxUrl} />
                </Input.Root>
              )}
            </FormSection>
          );
        })}

        <FormSection
          title="Social"
          description="Full links to your profiles, starting with https://."
        >
          <Input.Root error={errors.instagram}>
            <Input.Label htmlFor="instagram">
              Instagram
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="instagram"
              type="url"
              placeholder="https://www.instagram.com/…"
              {...register("instagram")}
            />
            <Input.Error error={errors.instagram} />
          </Input.Root>
          <Input.Root error={errors.linkedin}>
            <Input.Label htmlFor="linkedin">
              LinkedIn
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              {...register("linkedin")}
            />
            <Input.Error error={errors.linkedin} />
          </Input.Root>
        </FormSection>

        <FormSection
          title="Email"
          description="Opens in the visitor's mail app, from the email icon and the Photography and Digital art cards. Without it, those two cards are hidden."
        >
          <Input.Root error={errors.email}>
            <Input.Label htmlFor="email">
              Email address
              <Input.Optional />
            </Input.Label>
            <Input.Field
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            <Input.Error error={errors.email} />
          </Input.Root>
        </FormSection>
      </form>

      {/* In the bottom bar, outside the form, so Save reaches it through the
          form attribute */}
      <SaveActions formId={FORM_ID} isDirty={isDirty} isPending={isPending} />
    </Page>
  );
};

export default ContactForm;
