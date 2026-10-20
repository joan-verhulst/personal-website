"use client";

import { type Control, useWatch } from "react-hook-form";
import { saveSearch } from "~/modules/cms/actions/site";
import FormSection from "~/modules/cms/components/form-section";
import Header from "~/modules/cms/components/header";
import Input from "~/modules/cms/components/input";
import Page from "~/modules/cms/components/page";
import SaveActions from "~/modules/cms/components/shell/save-actions";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import { type SearchValues, searchSchema } from "~/modules/cms/schema/site";
import type { PageKey } from "~/modules/content/types";
import type { SiteRow } from "~/modules/content/utils/rows";

const FORM_ID = "search-form";

const VISIBLE_LENGTH = 155;

interface Props {
  site: SiteRow;
  fallbacks: Record<PageKey, string>;
  titles: Record<PageKey, string>;
}

const Length = ({
  control,
  name,
}: {
  control: Control<SearchValues>;
  name: PageKey;
}) => {
  const value = useWatch({ control, name }) ?? "";
  if (!value.trim()) return null;
  const length = value.trim().length;

  return (
    <Input.Hint>
      {length} characters.
      {length > VISIBLE_LENGTH &&
        ` Search results cut it off at about ${VISIBLE_LENGTH}.`}
    </Input.Hint>
  );
};

const SearchForm = ({ site, fallbacks, titles }: Props) => {
  const { run, isPending } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    control,
    errors,
    setErrors,
    formState: { isDirty },
  } = useForm({
    schema: searchSchema,
    defaultValues: {
      home: site.search_home ?? "",
      uiUx: site.search_ui_ux ?? "",
      digitalArt: site.search_digital_art ?? "",
      photography: site.search_photography ?? "",
    },
  });

  useUnsavedWarning(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => saveSearch(values), "Search saved");
    if (!result) return;
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      return;
    }
    reset(values);
  });

  const field = (name: PageKey, label: string, description: string) => (
    <FormSection title={label} description={description}>
      <Input.Root error={errors[name]}>
        <Input.Label htmlFor={`search-${name}`}>
          Description
          <Input.Optional />
        </Input.Label>
        <Input.Textarea
          id={`search-${name}`}
          placeholder={fallbacks[name]}
          {...register(name)}
        />
        <Length control={control} name={name} />
        <Input.Error error={errors[name]} />
      </Input.Root>
    </FormSection>
  );

  return (
    <Page width="form">
      <Header
        title="Search"
        description="What Google and link previews show under each page's title. Left empty, a page uses the line shown in its field."
      />

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {field(
          "home",
          "Home",
          `Under "${titles.home}". Left empty, it's your about headline.`,
        )}
        {field("uiUx", "UI/UX", `Under "${titles.uiUx}".`)}
        {field("digitalArt", "Digital art", `Under "${titles.digitalArt}".`)}
        {field("photography", "Photography", `Under "${titles.photography}".`)}
      </form>

      {/* In the bottom bar, outside the form, so Save reaches it through the
          form attribute */}
      <SaveActions formId={FORM_ID} isDirty={isDirty} isPending={isPending} />
    </Page>
  );
};

export default SearchForm;
