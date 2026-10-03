"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "~/modules/cms/components/button";
import Input from "~/modules/cms/components/input";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import type { Enrollment } from "~/modules/cms/hooks/use-enrollment";

// In fours, which is how an app's own field shows a key while it's typed
const grouped = (secret: string) =>
  secret.match(/.{1,4}/g)?.join(" ") ?? secret;

interface Props {
  /** Null while the secret is being made, which shows the outline of it. */
  enrollment: Enrollment | null;
}

/**
 * What an authenticator app needs to add this site: the QR code to scan,
 * and the same secret as text for an app that can't scan, like one on the
 * phone the page itself is open on.
 */
const EnrollmentDetails = ({ enrollment }: Props) => {
  const [isCopied, setIsCopied] = useState(false);

  // The check mark turns back into the copy icon after a moment
  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setIsCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  if (!enrollment) {
    return (
      <div className="flex flex-col gap-4" aria-busy aria-live="polite">
        <span className="sr-only">Making your QR code…</span>
        <Skeleton className="mx-auto size-[202px] rounded-xl" />
        <Skeleton className="h-[58px] rounded-xl" />
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setIsCopied(true);
    } catch {
      toast.error("Couldn't copy the key. Select it and copy it by hand.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* White around the code, which a scanner needs to find its edges */}
      <div className="mx-auto rounded-xl border border-neutral-950/10 bg-white p-3">
        {/* A data URL straight from Supabase, so there's nothing for
            next/image to optimise */}
        <img
          src={enrollment.qrCode}
          alt="QR code to scan with your authenticator app"
          width={176}
          height={176}
          className="size-44"
        />
      </div>
      <Input.Root>
        <Input.Label as="span">
          Can't scan it? Enter this key instead
        </Input.Label>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 select-all rounded-xl border border-neutral-950/10 bg-neutral-50 px-3 py-2 font-medium text-neutral-950 text-xs leading-normal">
            {grouped(enrollment.secret)}
          </code>
          <Button
            size="icon"
            aria-label={isCopied ? "Key copied" : "Copy key"}
            onClick={copy}
          >
            {isCopied ? (
              <Check size={16} aria-hidden />
            ) : (
              <Copy size={16} aria-hidden />
            )}
          </Button>
        </div>
      </Input.Root>
    </div>
  );
};

export default EnrollmentDetails;
