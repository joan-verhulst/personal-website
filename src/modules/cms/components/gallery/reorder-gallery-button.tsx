"use client";

import Image from "next/image";
import { reorderGallery } from "~/modules/cms/actions/gallery";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import type { GalleryRow } from "~/modules/cms/components/gallery/gallery-grid";
import ReorderButton from "~/modules/cms/components/reorder-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { mediaUrl } from "~/modules/media/utils/media-url";

interface Props {
  kind: GalleryKind;
  // In their saved order
  rows: GalleryRow[];
}

/** The header's Reorder button and the dialog that puts the pieces in order. */
const ReorderGalleryButton = ({ kind, rows }: Props) => {
  const { run, isPending } = useAction();

  return (
    <ReorderButton
      title={`Reorder ${GALLERIES[kind].plural}`}
      items={rows.map((row) => ({
        id: row.id,
        title: row.title,
        // A piece whose image was deleted from Media shows the empty box
        thumbnail: row.image && (
          <Image src={mediaUrl(row.image)} alt="" fill sizes="48px" />
        ),
      }))}
      onSave={async (ids) => {
        const result = await run(() => reorderGallery(kind, ids), "Order saved");
        return !!result && !result.error;
      }}
      isPending={isPending}
    />
  );
};

export default ReorderGalleryButton;
