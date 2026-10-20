"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  type FieldPath,
  type FieldValues,
  type UseFormProps,
  useForm as useReactHookForm,
} from "react-hook-form";
import type * as v from "valibot";

type FormSchema = v.GenericSchema<FieldValues, FieldValues>;

interface UseFormOptions<Schema extends FormSchema>
  extends Omit<
    UseFormProps<v.InferInput<Schema>, unknown, v.InferOutput<Schema>>,
    "resolver"
  > {
  schema: Schema;
}

export const useForm = <Schema extends FormSchema>({
  schema,
  ...options
}: UseFormOptions<Schema>) => {
  type Input = v.InferInput<Schema>;

  const form = useReactHookForm<Input, unknown, v.InferOutput<Schema>>({
    resolver: valibotResolver(schema),
    ...options,
  });

  const setErrors = (fieldErrors: Record<string, string>) => {
    for (const [name, message] of Object.entries(fieldErrors)) {
      form.setError(name as FieldPath<Input>, { type: "server", message });
    }
  };

  const registerNullable = (name: FieldPath<Input>) =>
    form.register(name, {
      setValueAs: (value: unknown) =>
        value === "" || value === null || value === undefined ? null : value,
    });

  return {
    ...form,
    errors: form.formState.errors,
    setErrors,
    registerNullable,
  };
};
