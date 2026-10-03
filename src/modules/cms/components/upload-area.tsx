import { ImagePlus } from "lucide-react";
import type { ReactNode } from "react";
import cn from "~/utils/cn";

interface UploadAreaProps {
  /** The upload button, or a few of them. */
  children: ReactNode;
  /** What can be uploaded, under the buttons. */
  hint?: ReactNode;
  /** For the buttons' aria-describedby. */
  hintId?: string;
  /** Colours the border, like when a save was tried without a file. */
  hasError?: boolean;
  className?: string;
}

/**
 * Where a form asks for its first file: a dashed box with the upload button
 * in it. It's only as tall as what's in it, so the fields below stay in view.
 * Once there's a file, the form shows it with a Replace button instead.
 *
 * @example
 * <UploadArea hint="Images, MP4 or WebM" hasError={!!errors.media}>
 *   <UploadButton folder="work" accept="image/*" onUploaded={setMedia}>
 *     Upload
 *   </UploadButton>
 * </UploadArea>
 */
const UploadArea = ({
  children,
  hint,
  hintId,
  hasError,
  className,
}: UploadAreaProps) => (
  <div
    className={cn(
      "flex flex-col items-center gap-3 rounded-xl border border-dashed bg-neutral-50 px-4 py-6 text-center",
      hasError ? "border-error-500" : "border-neutral-950/15",
      className,
    )}
  >
    <ImagePlus size={20} aria-hidden className="text-neutral-400" />
    <div className="flex flex-wrap items-center justify-center gap-2">
      {children}
    </div>
    {hint && (
      <p
        id={hintId}
        className="max-w-[420px] text-neutral-600 text-xs leading-normal"
      >
        {hint}
      </p>
    )}
  </div>
);

export default UploadArea;
