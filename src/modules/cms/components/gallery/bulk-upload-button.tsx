"use client";

import { useRef } from "react";
import { toast } from "sonner";
import {
  addGalleryItem,
  discardGalleryUpload,
} from "~/modules/cms/actions/gallery";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { titleFromFile } from "~/modules/cms/utils/upload-media";

interface Props {
  kind: GalleryKind;
  disabled?: boolean;
  "aria-describedby"?: string;
  /** True from the first file to the last, so the dialog around it can wait. */
  onUploadingChange?: (isUploading: boolean) => void;
  /** Runs after the last file, with how many pieces were added. */
  onDone?: (added: number) => void;
}

const count = (total: number, config: { noun: string; plural: string }) =>
  `${total} ${total === 1 ? config.noun : config.plural}`;

/**
 * Adds many pieces at once, each titled after its file, for when filling in
 * the form would mean one round trip per image. It sits in the "New" dialog,
 * next to the button that picks a single image.
 */
const BulkUploadButton = ({
  kind,
  disabled,
  "aria-describedby": describedBy,
  onUploadingChange,
  onDone,
}: Props) => {
  const config = GALLERIES[kind];
  const { run } = useAction();
  const added = useRef(0);
  const failed = useRef(0);

  return (
    <UploadButton
      folder={config.folder}
      accept="image/*"
      multiple
      measureColor={config.measureColor}
      disabled={disabled}
      aria-describedby={describedBy}
      onUploaded={async (media, file) => {
        // No toast per file: twenty photos would be twenty toasts. One sums
        // them up after the last
        const result = await run(
          () =>
            addGalleryItem(kind, {
              title: titleFromFile(file.name).slice(0, 200) || "Untitled",
              description: "",
              image: media.path,
              width: media.width,
              height: media.height,
              hue: media.hue,
              chroma: media.chroma,
            }),
          false,
        );
        if (result && !result.error) {
          added.current += 1;
          return;
        }
        failed.current += 1;
        // There's no dialog holding on to a file that wasn't added
        discardGalleryUpload(kind, media.path).catch(() => undefined);
      }}
      onError={(message) => {
        failed.current += 1;
        toast.error(message);
      }}
      onUploadingChange={(isUploading) => {
        onUploadingChange?.(isUploading);
        if (isUploading) {
          added.current = 0;
          failed.current = 0;
          return;
        }
        if (added.current) {
          toast.success(
            failed.current
              ? `Added ${added.current} of ${count(added.current + failed.current, config)}`
              : `Added ${count(added.current, config)}`,
          );
        }
        onDone?.(added.current);
      }}
    >
      Upload several
    </UploadButton>
  );
};

export default BulkUploadButton;
