import type { Metadata } from "next";
import MediaLibrary from "~/modules/cms/components/media-library";
import { readMediaLibrary } from "~/modules/cms/utils/read-media";
import { adminClient } from "~/modules/cms/utils/require-admin";

export const metadata: Metadata = { title: "Media" };

const MediaAdmin = async () => {
  const supabase = await adminClient();
  const { files, hasDetails } = await readMediaLibrary(supabase);

  // Read once here, so the server and the browser agree on which unused
  // files are too new to remove
  return (
    <MediaLibrary files={files} hasDetails={hasDetails} now={Date.now()} />
  );
};

export default MediaAdmin;
