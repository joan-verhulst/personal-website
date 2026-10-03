"use client";

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
        description="The links on the contact widget. Leave a field empty to hide its icon."
      />

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
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

        <FormSection title="Email" description="Opens in the visitor's mail app.">
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
