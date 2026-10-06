"use client";

import type { VariantProps } from "class-variance-authority";
import { Upload } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import Button, { type buttonVariants } from "~/modules/cms/components/button";
import {
  type UploadedMedia,
  uploadMedia,
} from "~/modules/cms/utils/upload-media";

interface Props {
  folder: string;
  accept: string;
  multiple?: boolean;
  maxSize?: number;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: "default" | "sm";
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
  children: ReactNode;
  // Called once per file, after it's in Media
  onUploaded: (media: UploadedMedia) => Promise<void> | void;
  onError?: (message: string) => void;
  // True from the first file until the last one is done, so a form can wait
  onUploadingChange?: (isUploading: boolean) => void;
}

/** Picks files and uploads them one by one, showing how far along it is. */
const UploadButton = ({
  folder,
  accept,
  multiple,
  maxSize,
  variant = "tertiary",
  size = "default",
  disabled,
  className,
  "aria-describedby": describedBy,
  children,
  onUploaded,
  onError,
  onUploadingChange,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files];
    onUploadingChange?.(true);

    for (const [index, file] of list.entries()) {
      setProgress(
        list.length > 1 ? `Uploading ${index + 1} of ${list.length}…` : "Uploading…",
      );
      try {
        const media = await uploadMedia(file, folder, { maxSize });
        await onUploaded(media);
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "Upload failed.");
      }
    }

    setProgress(null);
    onUploadingChange?.(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isUploading = progress !== null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        isPending={isUploading}
        aria-describedby={describedBy}
        onClick={() => inputRef.current?.click()}
      >
        {/* The spinner takes over from the icon while files go up */}
        {!isUploading && <Upload size={16} aria-hidden />}
        {progress ?? children}
      </Button>
    </>
  );
};

export default UploadButton;
