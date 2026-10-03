import { createBrowserClient } from "@supabase/ssr";
import { env } from "~/env";

// Signing in, and uploading media straight from the browser to storage
export const createBrowserSupabase = () =>
  createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
