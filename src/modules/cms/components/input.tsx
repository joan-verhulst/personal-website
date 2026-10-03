"use client";

import { Eye, EyeOff, Search } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { SelectTrigger } from "~/modules/cms/components/primitives/select";
import cn from "~/utils/cn";

// Matches react-hook-form's FieldError closely enough to pass one straight
// in, without tying these inputs to a form library
interface FieldError {
  message?: string;
}

const fieldClass =
  "w-full rounded-xl border border-neutral-950/10 bg-white px-3 font-medium text-neutral-950 text-xs transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-neutral-600 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-600 group-data-[has-error=true]/error:border-error-500 group-data-[has-error=true]/error:focus:ring-error-500/20";

// ── What a field's parts know about each other ───────────────────────────────

type Described = { hint?: string; error?: string };

interface InputContextValue {
  /** The ids a hint and an error use when they aren't given one. */
  hintId: string;
  errorId: string;
  hasError: boolean;
  /** The hint and error that are on screen right now, by their real ids. */
  described: Described;
  describe: (part: keyof Described, id: string | undefined) => void;
}

const InputContext = createContext<InputContextValue | null>(null);

/**
 * What ties a control to its hint and error, for one that isn't an
 * <Input.Field />: spread it on the control. It only knows something inside
 * an <Input.Root />, elsewhere it's empty.
 */
export const useInputField = () => {
  const context = useContext(InputContext);
  if (!context) return {};

  const describedBy = [context.described.hint, context.described.error]
    .filter(Boolean)
    .join(" ");

  return {
    "aria-invalid": context.hasError || undefined,
    "aria-describedby": describedBy || undefined,
  };
};

// Tells the field which hint or error is showing, so it only points at
// elements that exist
const useDescribe = (part: keyof Described, id: string | undefined) => {
  const describe = useContext(InputContext)?.describe;

  useEffect(() => {
    if (!describe || !id) return;
    describe(part, id);
    return () => describe(part, undefined);
  }, [describe, part, id]);
};

interface InputRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  error?: FieldError;
}

/**
 * Holds one field: its label, control, hint and error. The error colours the
 * control's border through data-has-error, and the control is told about its
 * hint and error, so a screen reader reads them when the field gets focus.
 */
const Root = ({ children, className, error, ...props }: InputRootProps) => {
  const id = useId();
  const [described, setDescribed] = useState<Described>({});
  const hasError = !!error?.message;

  // Stays the same function, or the hint's effect would run on every change
  // it makes itself
  const describe = useCallback<InputContextValue["describe"]>(
    (part, partId) =>
      setDescribed((current) =>
        current[part] === partId ? current : { ...current, [part]: partId },
      ),
    [],
  );

  const value = useMemo<InputContextValue>(
    () => ({
      hintId: `${id}-hint`,
      errorId: `${id}-error`,
      hasError,
      described,
      describe,
    }),
    [id, hasError, described, describe],
  );

  return (
    <InputContext.Provider value={value}>
      <div
        data-has-error={hasError}
        className={cn("group/error relative flex flex-col gap-1.5", className)}
        {...props}
      >
        {children}
      </div>
    </InputContext.Provider>
  );
};

const labelClass = "font-medium text-neutral-700 text-xs";

type InputLabelProps =
  | ({ as?: "label" } & ComponentProps<"label">)
  | ({ as: "span" } & ComponentProps<"span">)
  | ({ as: "legend" } & ComponentProps<"legend">);

/**
 * A field's name. as="span" is for a field without one control to point at,
 * like an image with its upload button, and as="legend" for a fieldset.
 */
const Label = ({ as = "label", className, ...props }: InputLabelProps) => {
  const classes = cn(labelClass, className);

  if (as === "span") {
    return <span className={classes} {...(props as ComponentProps<"span">)} />;
  }
  if (as === "legend") {
    return (
      <legend className={classes} {...(props as ComponentProps<"legend">)} />
    );
  }
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor comes in through props
    <label className={classes} {...(props as ComponentProps<"label">)} />
  );
};

/** Goes after a label's text, for a field that may stay empty. */
const Optional = () => (
  <span className="font-normal text-neutral-600"> (optional)</span>
);

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

const Field = ({ className, ref, ...props }: InputFieldProps) => (
  <input
    className={cn(fieldClass, "h-[35px]", className)}
    ref={ref}
    {...useInputField()}
    {...props}
  />
);

const PasswordField = ({ className, ref, ...props }: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const field = useInputField();

  return (
    <div className="relative">
      <input
        className={cn(fieldClass, "h-[35px] pr-10", className)}
        ref={ref}
        type={showPassword ? "text" : "password"}
        {...field}
        {...props}
      />
      <button
        className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-[10px] text-neutral-600 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500"
        type="button"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const SearchField = ({ className, ref, ...props }: InputFieldProps) => (
  <div className="relative">
    <input
      className={cn(fieldClass, "h-[35px] pl-9", className)}
      ref={ref}
      type="search"
      {...props}
    />
    <Search
      size={16}
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-600"
    />
  </div>
);

interface InputTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

/** Grows with its content, so long texts don't scroll inside a tiny box. */
const Textarea = ({ className, ref, ...props }: InputTextareaProps) => (
  <textarea
    className={cn(
      fieldClass,
      "field-sizing-content min-h-20 resize-y py-2 leading-normal",
      className,
    )}
    ref={ref}
    {...useInputField()}
    {...props}
  />
);

/** A <SelectTrigger /> that knows its field's hint and error. */
const SelectField = (props: ComponentProps<typeof SelectTrigger>) => (
  <SelectTrigger {...useInputField()} {...props} />
);

const Hint = ({
  children,
  className,
  id,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => {
  const context = useContext(InputContext);
  const hintId = id ?? context?.hintId;
  useDescribe("hint", hintId);

  return (
    <p
      id={hintId}
      className={cn("text-neutral-600 text-xs leading-normal", className)}
      {...props}
    >
      {children}
    </p>
  );
};

interface InputErrorProps {
  error?: FieldError;
  id?: string;
  className?: string;
}

const ErrorLabel = ({ error, id, className }: InputErrorProps) => {
  const context = useContext(InputContext);
  const errorId = id ?? context?.errorId;
  useDescribe("error", error?.message ? errorId : undefined);

  if (!error?.message) return null;

  return (
    <span
      id={errorId}
      role="alert"
      className={cn(
        "flex items-center gap-1 text-error-600 text-xs",
        className,
      )}
    >
      {error.message}
    </span>
  );
};

/**
 * @example
 * <Input.Root error={errors.title}>
 *   <Input.Label htmlFor="title">Title</Input.Label>
 *   <Input.Field id="title" {...register("title")} />
 *   <Input.Hint>Shown under the image.</Input.Hint>
 *   <Input.Error error={errors.title} />
 * </Input.Root>
 *
 * @example
 * <Input.Root error={errors.link}>
 *   <Input.Label htmlFor="link">
 *     Link
 *     <Input.Optional />
 *   </Input.Label>
 *   <Input.Field id="link" type="url" {...register("link")} />
 *   <Input.Error error={errors.link} />
 * </Input.Root>
 */
const Input = {
  Root,
  Label,
  Optional,
  Field,
  PasswordField,
  SearchField,
  Textarea,
  SelectField,
  Hint,
  Error: ErrorLabel,
};

export default Input;
