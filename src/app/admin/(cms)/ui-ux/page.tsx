import type { Metadata } from "next";
import WallEditor from "~/modules/cms/components/wall-editor";
import { readWall } from "~/modules/cms/utils/read-wall";

export const metadata: Metadata = { title: "Wall" };

const WallAdmin = async () => {
  const { items, tags, blocks, lists } = await readWall();

  return (
    <WallEditor items={items} tags={tags} blocks={blocks} lists={lists} />
  );
};

export default WallAdmin;
