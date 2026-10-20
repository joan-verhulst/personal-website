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

interface FieldError {
  message?: string;
}

const fieldClass =
  "w-full rounded-xl border border-neutral-950/10 bg-white px-3 font-medium text-neutral-950 text-xs transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-neutral-600 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-600 group-data-[has-error=true]/error:border-error-500 group-data-[has-error=true]/error:focus:ring-error-500/20";

type Described = { hint?: string; error?: string };

interface InputContextValue {
  hintId: string;
  errorId: string;
  hasError: boolean;
  described: Described;
  describe: (part: keyof Described, id: string | undefined) => void;
}

const InputContext = createContext<InputContextValue | null>(null);

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

const Root = ({ children, className, error, ...props }: InputRootProps) => {
  const id = useId();
  const [described, setDescribed] = useState<Described>({});
  const hasError = !!error?.message;

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
