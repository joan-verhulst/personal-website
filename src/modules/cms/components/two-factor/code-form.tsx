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

/**
 * The state behind a <CodeForm />. onCode checks the code and resolves with a
 * message when it was refused, or null when it was right. A refused code is
 * cleared and the field takes focus again, ready for the next one.
 *
 * The form submits itself at the sixth digit, so the button is only there
 * for whoever expects one.
 *
 * @example
 * const code = useCodeForm(async (value) => {
 *   const { error } = await supabase.auth.mfa.challengeAndVerify({
 *     factorId,
 *     code: value,
 *   });
 *   return error ? codeErrorMessage(error) : null;
 * });
 *
 * <CodeForm form={code}>
 *   <Button type="submit" variant="primary" isPending={code.isPending}>
 *     Verify
 *   </Button>
 * </CodeForm>
 */
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
    // "That code isn't right" stays up while the next code is typed, instead
    // of turning into "Enter the 6-digit code" at its first digit
    reValidateMode: "onSubmit",
  });
  // The code that's being checked. The sixth digit and Enter can land
  // together, and one check at a time is enough
  const checking = useRef<string | null>(null);

  const onSubmit = handleSubmit(async ({ code }) => {
    if (checking.current !== null) return;
    checking.current = code;
    try {
      // Supabase answers with an error instead of throwing one, so a throw
      // is something else going wrong. The field says so either way
      const message = await onCode(code).catch((error: unknown) => {
        console.error(error);
        return "Couldn't check the code. Try again.";
      });
      if (!message) return;
      // A code works once and changes every 30 seconds, so there's nothing
      // in a refused one worth keeping
      setValue("code", "");
      setError("code", { type: "server", message });
      setFocus("code");
    } finally {
      checking.current = null;
    }
  });

  const field = register("code", {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      // The field stays editable during a check, since read-only would drop
      // a phone's keyboard. What's typed meanwhile is put back instead
      if (checking.current !== null) {
        setValue("code", checking.current);
        return;
      }
      // Apps show the code as "123 456", and that's how it gets pasted
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
  /** For a submit button outside the form, like in a dialog's footer. */
  id?: string;
  /** Puts the cursor in the field right away, when the code is all there is. */
  shouldFocus?: boolean;
  /** Keeps the code as it is, like while the next page loads. */
  isLocked?: boolean;
  /** The submit button, when it sits inside the form. */
  children?: ReactNode;
}

/** The field for a code from an authenticator app. See useCodeForm. */
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
          // Lets a password manager, or the phone itself, offer the code
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
