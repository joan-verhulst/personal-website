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
  rows: GalleryRow[];
}

const ReorderGalleryButton = ({ kind, rows }: Props) => {
  const { run, isPending } = useAction();

  return (
    <ReorderButton
      title={`Reorder ${GALLERIES[kind].plural}`}
      items={rows.map((row) => ({
        id: row.id,
        title: row.title,
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
