import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WallItemForm from "~/modules/cms/components/wall-item-form";
import { readWall } from "~/modules/cms/utils/read-wall";
import { describeUsage } from "~/modules/cms/utils/wall-preview";

export const metadata: Metadata = { title: "Edit item" };

interface Props {
  params: Promise<{ id: string }>;
}

const EditItemAdmin = async ({ params }: Props) => {
  const { id } = await params;
  const { items, tags, blocks, lists } = await readWall();
  const item = items.find((row) => row.id === decodeURIComponent(id));
  if (!item) notFound();

  return (
    <WallItemForm
      key={item.id}
      item={item}
      tags={tags}
      usage={describeUsage(item.id, blocks, lists)}
    />
  );
};

export default EditItemAdmin;
