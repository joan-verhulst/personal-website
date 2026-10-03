import type { Metadata } from "next";
import TagsEditor from "~/modules/cms/components/tags-editor";
import { readWall } from "~/modules/cms/utils/read-wall";

export const metadata: Metadata = { title: "Tags" };

// The editor renders the page's header itself, its New tag button opens the editor's dialog
const TagsAdmin = async () => {
  const { items, tags } = await readWall();
  const usage: Record<string, number> = {};
  for (const { tag_id } of items) {
    if (tag_id) usage[tag_id] = (usage[tag_id] ?? 0) + 1;
  }

  return <TagsEditor tags={tags} usage={usage} />;
};

export default TagsAdmin;
