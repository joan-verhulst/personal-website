import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Every content read is tagged with this. The CMS clears it on save, so the
// site stays static and only rebuilds when something changed.
export const CONTENT_TAG = "content";

/**
 * Reads content without a session. Requests are kept in the Next data cache
 * until a CMS save clears the tag, so visitors never wait on Supabase.
 */
export const createPublicClient = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "force-cache",
            next: { tags: [CONTENT_TAG] },
          }),
      },
    },
  );
