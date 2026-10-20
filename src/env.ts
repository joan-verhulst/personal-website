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
        NEXT_PUBLIC_ADMIN_HOST: v.optional(
            v.pipe(
                v.string(),
                v.regex(
                    /^[a-z0-9.-]+(:\d+)?$/i,
                    'The admin host is only a host, like admin.example.com, without https:// or a path.',
                ),
                v.regex(
                    /^admin\./i,
                    'The admin host has to start with "admin.", like admin.example.com: the proxy only serves the admin from its root on hosts like that.',
                ),
            ),
        ),
        NEXT_PUBLIC_SUPABASE_URL: v.pipe(
            v.string('Please set NEXT_PUBLIC_SUPABASE_URL.'),
            v.url('The Supabase url is badly formatted.'),
        ),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: v.pipe(
            v.string('Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
            v.nonEmpty('Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
        ),
        NEXT_PUBLIC_MEDIA_URL: v.pipe(
            v.string('Please set NEXT_PUBLIC_MEDIA_URL.'),
            v.url('The media url is badly formatted.'),
        ),
    },
    experimental__runtimeEnv: {
        NEXT_PUBLIC_URL:
            process.env.NEXT_PUBLIC_URL ??
            process.env.APP_URL ??
            (process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : `http://localhost:${process.env.PORT ?? 3000}`),
        NEXT_PUBLIC_ADMIN_HOST: process.env.NEXT_PUBLIC_ADMIN_HOST || undefined,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL,
    },
});

export { env };
