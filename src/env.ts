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
        // The host the admin is served on, like "admin.example.com". Unset,
        // the admin stays at /admin on the site's own host.
        NEXT_PUBLIC_ADMIN_HOST: v.optional(
            v.pipe(
                v.string(),
                v.regex(
                    /^[a-z0-9.-]+(:\d+)?$/i,
                    'The admin host is only a host, like admin.example.com, without https:// or a path.',
                ),
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
        // Where the media bucket on R2 is served, its custom domain, like
        // https://media.example.com
        NEXT_PUBLIC_MEDIA_URL: v.pipe(
            v.string('Please set NEXT_PUBLIC_MEDIA_URL.'),
            v.url('The media url is badly formatted.'),
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
        // An empty value counts as unset
        NEXT_PUBLIC_ADMIN_HOST: process.env.NEXT_PUBLIC_ADMIN_HOST || undefined,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL,
    },
});

export { env };
