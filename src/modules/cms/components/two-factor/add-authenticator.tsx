"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import * as v from "valibot";
import Button from "~/modules/cms/components/button";
import Input from "~/modules/cms/components/input";
import {
  Dialog,
  DialogClose,
  DialogShell,
  DialogTrigger,
} from "~/modules/cms/components/primitives/dialog";
import CodeForm, {
  useCodeForm,
} from "~/modules/cms/components/two-factor/code-form";
import EnrollmentDetails from "~/modules/cms/components/two-factor/enrollment-details";
import {
  type EnrollmentFailure,
  useEnrollment,
} from "~/modules/cms/hooks/use-enrollment";
import { useForm } from "~/modules/cms/hooks/use-form";
import { freeFactorName } from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

const NAME_TAKEN = "You already have one with that name.";

const nameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Give it a name."),
    v.maxLength(40, "Keep the name under 40 characters."),
  ),
});

interface Props {
  /** The names in use. Supabase refuses a second authenticator with one. */
  names: string[];
  /**
   * The authenticator the new one takes the place of. It's removed once the
   * new one has proven itself with a code, so the account is never without.
   */
  replaces?: { id: string; name: string };
  /** Supabase wants this session's code again before it adds anything. */
  onNeedsCode: () => void;
}

/**
 * The button and dialog that add an authenticator, as a backup or in place
 * of another: first a name to tell it apart by, then the same QR code and
 * first code as the setup page. Closing the dialog before the code is in
 * adds nothing, and removes nothing either.
 */
const AddAuthenticator = ({ names, replaces, onNeedsCode }: Props) => {
  const id = useId();
  const nameFormId = `${id}-name`;
  const codeFormId = `${id}-code`;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { enrollment, start, confirm, discard, reset } = useEnrollment();

  const {
    register,
    handleSubmit,
    errors,
    setError,
    setFocus,
    reset: resetName,
    formState: { isSubmitting: isStarting },
  } = useForm({
    schema: nameSchema,
    defaultValues: { name: freeFactorName(names) },
  });

  const onName = handleSubmit(async ({ name }) => {
    const failure: EnrollmentFailure | null = names.includes(name)
      ? { message: NAME_TAKEN }
      : await start(name);
    if (!failure) return;

    if (failure.code === "insufficient_aal") {
      setIsOpen(false);
      onNeedsCode();
      return;
    }
    setError("name", { type: "server", message: failure.message });
    setFocus("name");
  });

  const code = useCodeForm(async (value) => {
    const message = await confirm(value);
    if (message) return message;

    if (replaces) {
      const { error } = await createBrowserSupabase().auth.mfa.unenroll({
        factorId: replaces.id,
      });
      // Both work now, and the list offers Remove for the old one
      if (error) {
        toast.error(
          `The new authenticator works, but "${replaces.name}" couldn't be removed. Remove it from the list.`,
        );
      } else {
        toast.success("Authenticator replaced");
      }
    } else {
      toast.success("Authenticator added");
    }
    setIsOpen(false);
    router.refresh();
    return null;
  });

  const isPending = isStarting || code.isPending;

  const handleOpenChange = (open: boolean) => {
    // Closing mid-request would hide how it went
    if (!open && isPending) return;
    if (open) {
      // A fresh start each time. Not on closing, which would swap the
      // dialog's content while it fades out
      reset();
      resetName({ name: freeFactorName(names) });
    } else {
      // A secret that never got its code is of no use to anyone
      discard();
    }
    setIsOpen(open);
  };

  const nameStepDescription = replaces
    ? `Set up the new one first. "${replaces.name}" is removed once the new one works.`
    : "A backup for when you can't get to your first one, on another device or in a password manager.";
  const submitLabel = replaces ? "Replace authenticator" : "Add authenticator";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {replaces ? (
          <Button size="sm" aria-label={`Replace ${replaces.name}`}>
            Replace
          </Button>
        ) : (
          <Button>
            <Plus size={16} aria-hidden />
            Add another authenticator
          </Button>
        )}
      </DialogTrigger>
      <DialogShell
        size="compact"
        title={replaces ? `Replace "${replaces.name}"` : "Add an authenticator"}
        description={
          enrollment
            ? "Scan the QR code with the app, then enter the code it shows."
            : nameStepDescription
        }
        bodyClassName="flex flex-col gap-6"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          // A stray click next to the dialog never throws away a QR code
          // that may already be in the app
          if (isPending || enrollment) event.preventDefault();
        }}
        footer={
          <>
            <DialogClose asChild>
              <Button className="w-full sm:w-fit" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form={enrollment ? codeFormId : nameFormId}
              variant="primary"
              className="w-full sm:w-fit"
              isPending={isPending}
            >
              {enrollment ? submitLabel : "Continue"}
            </Button>
          </>
        }
      >
        {enrollment ? (
          <>
            <EnrollmentDetails enrollment={enrollment} />
            <CodeForm form={code} id={codeFormId} />
          </>
        ) : (
          <form id={nameFormId} onSubmit={onName} noValidate>
            <Input.Root error={errors.name}>
              <Input.Label htmlFor={`${id}-name-field`}>Name</Input.Label>
              <Input.Field
                id={`${id}-name-field`}
                autoComplete="off"
                {...register("name")}
              />
              <Input.Hint>
                To tell it apart from the others, like the app or the device
                it's on.
              </Input.Hint>
              <Input.Error error={errors.name} />
            </Input.Root>
          </form>
        )}
      </DialogShell>
    </Dialog>
  );
};

export default AddAuthenticator;
