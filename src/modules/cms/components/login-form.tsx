"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import * as v from "valibot";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import Input from "~/modules/cms/components/input";
import { useForm } from "~/modules/cms/hooks/use-form";
import { withRedirectTo } from "~/modules/cms/utils/redirect-to";
import {
  hasVerifiedFactor,
  SETUP_PATH,
  VERIFY_PATH,
} from "~/modules/cms/utils/two-factor";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";

const schema = v.object({
  email: v.pipe(
    v.string(),
    v.nonEmpty("Enter your email address."),
    v.email("Enter a valid email address."),
  ),
  password: v.pipe(v.string(), v.nonEmpty("Enter your password.")),
});

interface Props {
  /**
   * Where to go once signed in: a canonical path, already checked to be a
   * CMS page. The two-factor step comes first and passes it on.
   */
  redirectTo: string;
}

const LoginForm = ({ redirectTo }: Props) => {
  const router = useRouter();
  const { onAdminHost } = useAdminPath();
  // Stays pending while the CMS loads, so the button can't be pressed twice
  const [isNavigating, startNavigation] = useTransition();
  const {
    register,
    handleSubmit,
    errors,
    setError,
    setFocus,
    formState: { isSubmitting },
  } = useForm({
    schema,
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (credentials) => {
    const { data, error } =
      await createBrowserSupabase().auth.signInWithPassword(credentials);

    if (error) {
      // Stays in the form, next to the field to try again in. Supabase
      // doesn't say which of the two was wrong, and neither does this
      setError("password", {
        type: "server",
        message:
          error.code === "invalid_credentials"
            ? "That email and password don't match."
            : error.message,
      });
      setFocus("password");
      return;
    }

    // The password is only half of it: next comes the code, or setting up
    // an authenticator for an account without one. The proxy would send the
    // session there too, this just skips the detour
    const nextStep = hasVerifiedFactor(data.user) ? VERIFY_PATH : SETUP_PATH;

    startNavigation(() => {
      router.replace(withRedirectTo(nextStep, redirectTo, onAdminHost));
      router.refresh();
    });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Input.Root error={errors.email}>
        <Input.Label htmlFor="email">Email</Input.Label>
        <Input.Field
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        <Input.Error error={errors.email} />
      </Input.Root>
      <Input.Root error={errors.password}>
        <Input.Label htmlFor="password">Password</Input.Label>
        <Input.PasswordField
          id="password"
          autoComplete="current-password"
          {...register("password")}
        />
        <Input.Error error={errors.password} />
      </Input.Root>
      <Button
        type="submit"
        variant="primary"
        className="mt-2 w-full"
        isPending={isSubmitting || isNavigating}
        withArrow
      >
        Sign in
      </Button>
    </form>
  );
};

export default LoginForm;
