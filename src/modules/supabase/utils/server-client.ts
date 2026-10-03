import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "~/env";

/**
 * Acts as the signed in user, for the CMS. Create one per request. Writes go
 * through row level security, so only admins get anything done with it.
 */
export const createSessionClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components can't set cookies. The proxy refreshes the
            // session before they run, so there's nothing to keep here.
          }
        },
      },
    },
  );
};
