import { createEnv } from '@t3-oss/env-nextjs';
import * as v from 'valibot';

const env = createEnv({
    client: {
        NEXT_PUBLIC_URL: v.optional(
            v.pipe(
                v.string(),
                v.nonEmpty('Please enter your url.'),
                v.url('The url is badly formatted.'),
            ),
        ),
        // Supabase project URL, from Project Settings → API
        NEXT_PUBLIC_SUPABASE_URL: v.pipe(
            v.string('Please set NEXT_PUBLIC_SUPABASE_URL.'),
            v.url('The Supabase url is badly formatted.'),
        ),
        // The publishable (or legacy anon) key. Safe in the browser: the
        // database only lets admins write, see supabase/migrations.
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: v.pipe(
            v.string('Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
            v.nonEmpty('Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
        ),
    },
    // Since Next.js 13.4.4 or later, only client variables need to be specified.
    experimental__runtimeEnv: {
        NEXT_PUBLIC_URL:
            process.env.NEXT_PUBLIC_URL ??
            process.env.APP_URL ??
            (process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : `http://localhost:${process.env.PORT ?? 3000}`),
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
});

export { env };
