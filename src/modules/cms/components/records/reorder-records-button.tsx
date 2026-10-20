"use client";

import Image from "next/image";
import { reorderRecords } from "~/modules/cms/actions/records";
import ReorderButton from "~/modules/cms/components/reorder-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import type { RecordRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/media/utils/media-url";

const ReorderRecordsButton = ({ rows }: { rows: RecordRow[] }) => {
  const { run, isPending } = useAction();

  return (
    <ReorderButton
      title="Reorder records"
      description="The first one spins on the home page widget. Drag the rows, or use their arrow buttons, to change the order."
      items={rows.map((row) => ({
        id: row.id,
        title: row.title,
        thumbnail: (
          <span className="block bg-white">
            <span className="relative mx-auto block aspect-square h-full overflow-hidden rounded-md">
              {row.cover && (
                <Image src={mediaUrl(row.cover)} alt="" fill sizes="36px" />
              )}
            </span>
          </span>
        ),
      }))}
      onSave={async (ids) => {
        const result = await run(() => reorderRecords(ids), "Order saved");
        return !!result && !result.error;
      }}
      isPending={isPending}
    />
  );
};

export default ReorderRecordsButton;
