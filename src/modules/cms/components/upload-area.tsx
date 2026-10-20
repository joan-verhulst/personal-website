import { ImagePlus } from "lucide-react";
import type { ReactNode } from "react";
import cn from "~/utils/cn";

interface UploadAreaProps {
  children: ReactNode;
  hint?: ReactNode;
  hintId?: string;
  hasError?: boolean;
  className?: string;
}

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
