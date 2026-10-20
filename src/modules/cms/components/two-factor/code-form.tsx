"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import * as v from "valibot";
import Input from "~/modules/cms/components/input";
import { useForm } from "~/modules/cms/hooks/use-form";

const CODE_LENGTH = 6;

const schema = v.object({
  code: v.pipe(
    v.string(),
    v.regex(/^\d{6}$/, "Enter the 6-digit code from your app."),
  ),
});

export const useCodeForm = (
  onCode: (code: string) => Promise<string | null>,
) => {
  const {
    register,
    handleSubmit,
    errors,
    setError,
    setFocus,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    schema,
    defaultValues: { code: "" },
    reValidateMode: "onSubmit",
  });
  const checking = useRef<string | null>(null);

  const onSubmit = handleSubmit(async ({ code }) => {
    if (checking.current !== null) return;
    checking.current = code;
    try {
      const message = await onCode(code).catch((error: unknown) => {
        console.error(error);
        return "Couldn't check the code. Try again.";
      });
      if (!message) return;
      setValue("code", "");
      setError("code", { type: "server", message });
      setFocus("code");
    } finally {
      checking.current = null;
    }
  });

  const field = register("code", {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      if (checking.current !== null) {
        setValue("code", checking.current);
        return;
      }
      const digits = event.target.value
        .replace(/\D/g, "")
        .slice(0, CODE_LENGTH);
      if (digits !== event.target.value) setValue("code", digits);
      if (digits.length === CODE_LENGTH) onSubmit();
    },
  });

  return {
    field,
    error: errors.code,
    onSubmit,
    setFocus,
    isPending: isSubmitting,
  };
};

interface CodeFormProps {
  form: ReturnType<typeof useCodeForm>;
  id?: string;
  shouldFocus?: boolean;
  isLocked?: boolean;
  children?: ReactNode;
}

const CodeForm = ({
  form,
  id,
  shouldFocus,
  isLocked,
  children,
}: CodeFormProps) => {
  const fieldId = useId();
  const { setFocus } = form;

  useEffect(() => {
    if (shouldFocus) setFocus("code");
  }, [shouldFocus, setFocus]);

  return (
    <form
      id={id}
      className="flex flex-col gap-4"
      onSubmit={form.onSubmit}
      noValidate
    >
      <Input.Root error={form.error}>
        <Input.Label htmlFor={fieldId}>6-digit code</Input.Label>
        <Input.Field
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          pattern="[0-9]*"
          className="tabular-nums tracking-[0.3em]"
          readOnly={isLocked}
          {...form.field}
        />
        <Input.Error error={form.error} />
      </Input.Root>
      {children}
    </form>
  );
};

export default CodeForm;
