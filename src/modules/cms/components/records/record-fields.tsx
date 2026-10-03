"use client";

import { Controller } from "react-hook-form";
import Input from "~/modules/cms/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import {
  type RecordValues,
  recordSchema,
  toAppleId,
} from "~/modules/cms/components/records/schema";
import { useForm } from "~/modules/cms/hooks/use-form";
import type { RecordRow } from "~/modules/content/utils/rows";

export const emptyRecord: RecordValues = {
  type: "album",
  title: "",
  artist: "",
  appleId: 0,
  favoriteTitle: "",
};

export const recordValuesFrom = (row: RecordRow): RecordValues => ({
  type: row.type,
  title: row.title,
  artist: row.artist,
  appleId: Number(row.apple_id),
  favoriteTitle: row.favorite_title,
});

/** The form both the new record dialog and the edit dialog fill in. */
export const useRecordForm = (defaultValues: RecordValues) =>
  useForm({ schema: recordSchema, defaultValues });

type RecordForm = ReturnType<typeof useRecordForm>;

const typeOptions = [
  { value: "album" as const, label: "Album" },
  { value: "song" as const, label: "Song" },
];

interface FieldsProps {
  form: RecordForm;
  // Keeps ids unique when two record forms share a page
  idPrefix: string;
  /** Runs before the type changes, with the type it's changing to. */
  onTypeChange?: (type: RecordValues["type"]) => void;
}

/** Type, title and artist: what the record is. */
export const RecordDetailsFields = ({
  form,
  idPrefix,
  onTypeChange,
}: FieldsProps) => {
  const { control, register, errors } = form;

  return (
    <>
      <Input.Root error={errors.type}>
        <Input.Label htmlFor={`${idPrefix}-type`}>Type</Input.Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={(value) => {
                const type = value as RecordValues["type"];
                onTypeChange?.(type);
                field.onChange(type);
              }}
            >
              <Input.SelectField
                id={`${idPrefix}-type`}
                ref={field.ref}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </Input.SelectField>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Input.Error error={errors.type} />
      </Input.Root>
      <Input.Root error={errors.title}>
        <Input.Label htmlFor={`${idPrefix}-title`}>Title</Input.Label>
        <Input.Field id={`${idPrefix}-title`} {...register("title")} />
        <Input.Error error={errors.title} />
      </Input.Root>
      <Input.Root error={errors.artist}>
        <Input.Label htmlFor={`${idPrefix}-artist`}>Artist</Input.Label>
        <Input.Field id={`${idPrefix}-artist`} {...register("artist")} />
        <Input.Error error={errors.artist} />
      </Input.Root>
    </>
  );
};

/** The song whose preview plays on the turntable. */
export const FavoriteSongFields = ({ form, idPrefix }: FieldsProps) => {
  const { register, errors } = form;

  return (
    <>
      <Input.Root error={errors.favoriteTitle}>
        <Input.Label htmlFor={`${idPrefix}-favorite`}>
          Favorite song
          <Input.Optional />
        </Input.Label>
        <Input.Field
          id={`${idPrefix}-favorite`}
          {...register("favoriteTitle")}
        />
        <Input.Hint>Shown until Apple Music's own title loads.</Input.Hint>
        <Input.Error error={errors.favoriteTitle} />
      </Input.Root>
      <Input.Root error={errors.appleId}>
        <Input.Label htmlFor={`${idPrefix}-apple-id`}>
          Apple Music song ID
        </Input.Label>
        <Input.Field
          id={`${idPrefix}-apple-id`}
          inputMode="numeric"
          {...register("appleId", { setValueAs: toAppleId })}
        />
        <Input.Hint>Or paste the song's Apple Music link.</Input.Hint>
        <Input.Error error={errors.appleId} />
      </Input.Root>
    </>
  );
};
