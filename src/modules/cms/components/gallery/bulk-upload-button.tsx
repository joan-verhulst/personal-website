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

export const useAddPieces = (kind: GalleryKind) => {
  const config = GALLERIES[kind];
  const { run } = useAction();
  const added = useRef(0);
  const failed = useRef(0);

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
    if (result && !result.error) added.current += 1;
    else failed.current += 1;
  };

  /** A file that never got as far as being added, like a failed upload. */
  const fail = () => {
    failed.current += 1;
  };

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
  onUploadingChange?: (isUploading: boolean) => void;
  onDone?: (added: number) => void;
}

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
