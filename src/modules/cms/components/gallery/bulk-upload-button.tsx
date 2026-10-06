"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { addGalleryItem } from "~/modules/cms/actions/gallery";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import {
  titleFromFile,
  type UploadedMedia,
} from "~/modules/cms/utils/upload-media";

const count = (total: number, config: { noun: string; plural: string }) =>
  `${total} ${total === 1 ? config.noun : config.plural}`;

/**
 * Adds pieces one by one, each titled after its file, and sums them up in
 * one toast at the end: twenty photos would be twenty toasts otherwise. For
 * a batch of uploads, or a batch picked from Media.
 */
export const useAddPieces = (kind: GalleryKind) => {
  const config = GALLERIES[kind];
  const { run } = useAction();
  const added = useRef(0);
  const failed = useRef(0);

  /** Call before the first file. */
  const start = () => {
    added.current = 0;
    failed.current = 0;
  };

  const add = async (media: UploadedMedia) => {
    const result = await run(
      () =>
        addGalleryItem(kind, {
          title: titleFromFile(media.name).slice(0, 200) || "Untitled",
          description: "",
          image: media.path,
          width: media.width,
          height: media.height,
          hue: media.hue,
          chroma: media.chroma,
        }),
      false,
    );
    // The file stays in Media either way, so a failure only needs counting
    if (result && !result.error) added.current += 1;
    else failed.current += 1;
  };

  /** A file that never got as far as being added, like a failed upload. */
  const fail = () => {
    failed.current += 1;
  };

  /** Call after the last file. Returns how many were added. */
  const finish = () => {
    if (added.current) {
      toast.success(
        failed.current
          ? `Added ${added.current} of ${count(added.current + failed.current, config)}`
          : `Added ${count(added.current, config)}`,
      );
    }
    return added.current;
  };

  return { start, add, fail, finish };
};

interface Props {
  kind: GalleryKind;
  disabled?: boolean;
  "aria-describedby"?: string;
  /** True from the first file to the last, so the dialog around it can wait. */
  onUploadingChange?: (isUploading: boolean) => void;
  /** Runs after the last file, with how many pieces were added. */
  onDone?: (added: number) => void;
}

/**
 * Uploads and adds many pieces at once, each titled after its file, for when
 * filling in the form would mean one round trip per image. It sits in the
 * "New" dialog, next to the button that uploads a single image.
 */
const BulkUploadButton = ({
  kind,
  disabled,
  "aria-describedby": describedBy,
  onUploadingChange,
  onDone,
}: Props) => {
  const config = GALLERIES[kind];
  const pieces = useAddPieces(kind);

  return (
    <UploadButton
      folder={config.folder}
      accept="image/*"
      multiple
      disabled={disabled}
      aria-describedby={describedBy}
      onUploaded={pieces.add}
      onError={(message) => {
        pieces.fail();
        toast.error(message);
      }}
      onUploadingChange={(isUploading) => {
        onUploadingChange?.(isUploading);
        if (isUploading) pieces.start();
        else onDone?.(pieces.finish());
      }}
    >
      Upload several
    </UploadButton>
  );
};

export default BulkUploadButton;
