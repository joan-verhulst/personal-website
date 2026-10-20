import type { Metadata } from "next";
import MediaLibrary from "~/modules/cms/components/media-library";
import { readMediaLibrary } from "~/modules/cms/utils/read-media";
import { adminClient } from "~/modules/cms/utils/require-admin";

export const metadata: Metadata = { title: "Media" };

const MediaAdmin = async () => {
  const supabase = await adminClient();
  const { files, hasDetails } = await readMediaLibrary(supabase);

  return (
    <MediaLibrary files={files} hasDetails={hasDetails} now={Date.now()} />
  );
};

export default MediaAdmin;
