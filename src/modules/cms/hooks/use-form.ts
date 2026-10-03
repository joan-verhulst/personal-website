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

/**
 * react-hook-form checked against a valibot schema. Use the same schema in
 * the server action, so both sides agree on what's valid.
 *
 * register is react-hook-form's own, so checkboxes stay booleans and number
 * inputs with valueAsNumber stay numbers. registerNullable is for text that's
 * stored as null when empty.
 *
 * @example
 * const { register, handleSubmit, errors, setErrors } = useForm({
 *   schema: contactSchema,
 *   defaultValues: contact,
 * });
 * const { run, isPending } = useAction();
 *
 * const onSubmit = handleSubmit(async (values) => {
 *   const result = await run(() => saveContact(values), "Contact saved");
 *   if (result?.fieldErrors) setErrors(result.fieldErrors);
 * });
 */
export const useForm = <Schema extends FormSchema>({
  schema,
  ...options
}: UseFormOptions<Schema>) => {
  type Input = v.InferInput<Schema>;

  const form = useReactHookForm<Input, unknown, v.InferOutput<Schema>>({
    resolver: valibotResolver(schema),
    ...options,
  });

  /** Shows errors from the server next to their fields, keyed by name. */
  const setErrors = (fieldErrors: Record<string, string>) => {
    for (const [name, message] of Object.entries(fieldErrors)) {
      form.setError(name as FieldPath<Input>, { type: "server", message });
    }
  };

  /** Like register, but an emptied field becomes null instead of "". */
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
