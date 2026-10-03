import type { Metadata } from "next";
import WallItemForm from "~/modules/cms/components/wall-item-form";
import { readWall } from "~/modules/cms/utils/read-wall";

export const metadata: Metadata = { title: "New item" };

interface Props {
  searchParams: Promise<{ list?: string | string[] }>;
}

// The same form as the edit page, empty. ?list=experiments comes from New item
// on the Experiments tab, and puts the item at the end of that list too
const NewItemAdmin = async ({ searchParams }: Props) => {
  const { list } = await searchParams;
  const { tags } = await readWall();

  return (
    <WallItemForm
      tags={tags}
      list={list === "experiments" ? "experiments" : undefined}
    />
  );
};

export default NewItemAdmin;
