# **CMS**

The site's content lives in Supabase and is edited at **`/admin`**, or on a host of its own (see [Admin address](#admin-address)): UI/UX work, photography, digital art, the records on rotation, the about modal and the contact links. Gear and the page chrome (labels, metadata) stay in code.

### **How it fits together**

-   **Database**: tables per kind of content, see `supabase/migrations/0001_cms.sql`. Anyone can read, only users in `public.admins` can write (row level security).
-   **Signing in** takes a password and a code from an authenticator app, see [Two-factor](#two-factor) below.
-   **Media**: every image and video is in the `media` bucket on Cloudflare R2, served from its own domain (`NEXT_PUBLIC_MEDIA_URL`). Downloads from R2 are free, which is why it's there and not in Supabase Storage. The database stores paths, `mediaUrl()` turns them into URLs. See [Media on R2](#media-on-r2).
-   **Site**: `getContent()` reads everything once per request and hands it to client components through `ContentProvider` / `useContent()`. Reads are cached under the `content` tag, so pages stay static.
-   **CMS**: server actions in `src/modules/cms/actions` write through the signed in user's session, then call `updateTag("content")`. The next visit rebuilds the pages with the change.
-   **Uploads** go straight from the browser to R2, so big files never pass through the server. Images are scaled down first (2560px, UI screenshots 3200px), and photos get their hue measured for the photo table. A file can be 40 MB at most, and has to be a JPEG, PNG, WebP, GIF, AVIF, SVG, MP4 or WebM: the upload button checks this, and the server only signs uploads that pass.

<br>

### **Setting it up**

1. **Schema.** In the Supabase dashboard, open the SQL editor and run the files in `supabase/migrations` in order: `0001_cms.sql` (tables and access), `0002_wall_double.sql` (the double row on the wall) and `0003_cms_hardening.sql` (reordering and deleting in one step; its limits on the Supabase storage bucket date from before media moved to R2). The last two are safe to run again. Then `0005_optional_tag.sql` (UI/UX items without a tag) and `0006_media_library.sql` (the media library, see [Media library](#media-library)). `0004_two_factor.sql` comes later, in step 7.
2. **Your account.** Authentication → Users → *Add user*, with your email and a password. Then turn off sign ups: Authentication → Sign In / Providers → *Allow new users to sign up*, and *Allow anonymous sign-ins* on the same page. Check that Authentication → Users lists only your own account afterwards, and delete any other. Strangers with an account can't change content, but they can fill the list and use up the project's email limit.
3. **Make it an admin.** In the SQL editor:

    ```sql
    insert into public.admins (user_id)
    select id from auth.users where email = 'you@example.com';
    ```

4. **Keys.** Copy `.env.example` to `.env.local` and fill in the values from Project Settings → API. The secret key is only used by the import script. Set up the media bucket too, see [Media on R2](#media-on-r2).
5. **Import.** Uploads all media from `public/assets` and fills the tables with the content that used to be hard-coded (kept in `scripts/content`):

    ```
    pnpm run import-content
    ```

    It stops if there's content already, so it can't undo CMS edits by accident. `--force` imports anyway.

6. **Run it.** `pnpm run dev`, then sign in at `/admin`. If the dev server was running during the import, it may have cached half-imported content: press **Refresh site** on the CMS home page.
7. **Two-factor.** The first sign in asks you to set up an authenticator app. Once that works, run `supabase/migrations/0004_two_factor.sql` in the SQL editor, so the database asks for the code too. More under [Two-factor](#two-factor).

Edits made outside the CMS (in the Supabase dashboard, or by the import script) don't clear the site's cache by themselves. **Refresh site** does.

On Vercel, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDIA_URL` and the four `R2_` variables to the project's environment variables, the R2 keys as Sensitive. The Supabase secret key never goes there.

<br>

### **Two-factor**

Signing in takes two steps: your email and password, then a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy and the like). Without the code a session can't open the CMS or save anything.

-   **Setup.** An account without an authenticator lands on `/admin/two-factor` right after its password. Scan the QR code with the app, or type the key in by hand, and enter the first code the app shows. From then on every sign in asks for a code at `/admin/login/verify`. Leaving setup halfway does no harm: nothing counts until that first code is in, and the next visit starts with a fresh QR code.
-   **Backup.** Add a second authenticator under **Security** in the sidebar (`/admin/security`), on another device or in a password manager. A code from either one signs you in. The same page removes one. Your only authenticator can't be removed, only replaced: the new one is set up first and the old one goes once the new one works, so the account is never without.
-   **Recovery.** If you lose every authenticator, open the Supabase dashboard, go to Authentication → Users, and choose *Remove MFA factors* from your account's menu. The next sign in asks you to set up a new one. Do that right away: until you have, your password alone is enough to set one up. Whoever can sign in to the Supabase dashboard can do this, so that account deserves two-factor of its own.
-   **The migration.** The proxy, the screens and the server actions all refuse a session without a code. `supabase/migrations/0004_two_factor.sql` makes the database refuse it too, by adding the check to `is_admin()`, which every write policy on the tables calls. Run it in the SQL editor **after** you've set up your authenticator and signed in with a code once. It's safe to run again, the CMS works both before and after it, and the file's header says how to undo it. Until it has been run, a stolen password could still write to the database by calling Supabase directly, and the Security page shows a warning that says so. The media bucket on R2 doesn't depend on it: only the server holds its keys, and every action that uses them asks for the code first.

Authenticator apps (TOTP) are on by default in Supabase. If setup says they're turned off, enable TOTP under Authentication → Multi-Factor in the dashboard.

<br>

### **Media on R2**

Images and videos are in a Cloudflare R2 bucket, reached from the server over R2's S3 API with `aws4fetch` (`src/modules/media/utils/storage.ts`). Only server code holds the keys. The browser never gets one:

-   **Uploading.** The upload button asks `createUpload` for a place to put the file. That action checks the session and its code, picks a random name in the content's folder, and signs a URL that takes exactly this file, its type and its size, for ten minutes. The browser then sends the file to that URL itself. A file can't overwrite another, land in another folder or be larger than it said.
-   **Removing** only happens on the Media page, through the same server-side helpers, after the same checks. See [Media library](#media-library).
-   **Serving.** The bucket is public on its custom domain only, behind Cloudflare's cache. Files are stored with a year of `Cache-Control`, since a changed file always gets a new name.
-   **Display copies, no resizing on request.** Vercel's image optimization isn't used for media: every `<Image>` that shows a file from the bucket has `unoptimized`, so the browser loads it straight from R2, and downloads stay free and uncapped. Instead, every photo-like image (JPEG, PNG, WebP, AVIF) gets a display copy when it's uploaded: `name.display.webp` next to the file, at most `DISPLAY_SIZE` (1600px) on its long side, made on the server with sharp by `finishUpload` (and for record covers by `addRecord`). An upload without its copy fails and is removed again. The site shows the copy (`displayUrl()`); the file itself (`mediaUrl()`) is for large views, like the photo and art slider, and for the UI/UX wall, where screenshots have to stay sharp. Deleting a file deletes its copy; the Media page and the picker leave copies out but count them in the storage used.
-   **Preloading.** `MediaPreloader` loads every section's images in the background, a few at a time, starting 2.5 seconds after the page has loaded, so the home intro plays first. Opening Photography, Digital art or the wall then shows them at once. Videos aren't preloaded, and neither is anything for a visitor who has Save-Data on or a 2G connection.
-   **The free limit.** R2 stores 10 GB for free, and the bucket never holds more: an upload (or a record's cover) that would take it past `STORAGE_LIMIT_BYTES` is refused before it's signed, and so is one when the bucket can't be listed. The **Media** page shows how much of the 10 GB is left.

To set it up:

1. **Domain on Cloudflare.** R2 can only serve on a domain whose DNS Cloudflare runs. Add the domain to a free Cloudflare account and point its nameservers there. Keep the records that lead to Vercel (the apex `A` record and the `CNAME`s for `www` and the admin host) on **DNS only**, not proxied.
2. **Bucket.** R2 → Create bucket, named `media`. Under Settings → Custom Domains, connect `media.<your domain>`. Leave the `r2.dev` URL off.
3. **CORS.** Under Settings → CORS Policy, allow uploads from the admin. Every address you upload from has to be listed, so add `http://admin.localhost:3000` too if you use that locally:

    ```json
    [
      {
        "AllowedOrigins": ["https://admin.joanverhulst.com", "http://localhost:3000"],
        "AllowedMethods": ["PUT"],
        "AllowedHeaders": ["content-type", "cache-control"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```

    Preview deployments aren't listed, so uploading there fails. Everything else in the CMS works.

4. **Keys.** R2 → API Tokens → Create Account API token, with **Object Read & Write** on this bucket only. Copy the values under "credentials for S3 clients" into `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`, and the account ID into `R2_ACCOUNT_ID`. The token value at the top isn't used.

<br>

### **Media library**

Everything uploaded lands in Media and stays there until it's deleted on the **Media** page. The pages use files from it:

-   **Two ways in.** A page that takes an image or video can still upload its own (it lands in that page's folder), or **Choose from Media** for a file that's already there. Files uploaded on the Media page itself go to `library/`. The folder only says where a file came from: any page can use any file. The New photo and New artwork dialogs take several picks at once and add each as its own piece, titled after its file.
-   **What Media knows.** The bucket only holds files under random names. The `media` table (`0006_media_library.sql`) keeps the name a file was uploaded with, its size in pixels and its color, which the upload button measures. A pick fills a form with those, the same as an upload. Record covers fetched from Apple are measured on the server.
-   **Deleting content keeps the file.** Deleting a photo, artwork, record, item or tag, or replacing its file, leaves the file in Media, marked Unused when nothing else shows it. So does an upload in a form that was then cancelled.
-   **Deleting a file empties what used it.** A file can be deleted while it's in use: every row that shows it lets go of it first, and keeps its place without a file. The site leaves a photo, artwork or record without a file out, a UI/UX item without one takes its wall row off the site like an empty slot, and the About page goes without a photo. In the CMS such a row says "No image", and picking or uploading another puts it back.
-   **Remove unused** clears every file nothing uses in one go, except files from the last day, which may belong to a form that's still open.
-   **Both ways linked.** A file's menu on the Media page links to everything that uses it.

<br>

### **Admin address**

The admin can have a host of its own, like `admin.joanverhulst.com`, on the same Vercel project and deployment. That's one optional variable: **`NEXT_PUBLIC_ADMIN_HOST`**, the host without `https://` or a path. Without it the admin is at `/admin` on the site's own host, everywhere.

With it set, the proxy (`src/proxy.ts`) decides per request:

-   **On the admin host**, addresses have no `/admin` in them: `/` is the dashboard, `/ui-ux/items` the items, `/login` the sign in page. The proxy rewrites each one to the route under `/admin`, so the pages themselves stay where they are in `src/app/admin`. An address that does start with `/admin` is redirected to the one without. None of the public site's pages are served there: an unknown path shows the admin's own "Not found". Only what the proxy leaves alone is the same as on any host: files with an extension (icons, fonts, the manifest), Next's own files and the route handlers under `/api`.
-   **On every other host in production** (`VERCEL_ENV` is `production`), `/admin` and everything under it is a 404. The public domain doesn't show there's an admin at all, and the sign in cookies only ever exist on the admin host.
-   **Locally and on preview deployments** there's no admin host to visit, so `/admin` keeps working by path, whatever the variable says.

In code every admin path is written in one form, the canonical one: `/admin/ui-ux`. `src/modules/cms/utils/admin-path.ts` turns it into what the current host calls it and back. Links use `<AdminLink>` (and `<Button href>`), client code `useAdminPath()` and `useAdminPathname()`, server code `getAdminPaths()`. A new link or redirect to an admin page should go through one of those, never a bare `/admin/...` in an `href` or `redirect()`. **View site** and **Back to the site** use `NEXT_PUBLIC_URL` on the admin host, since `/` is the dashboard there.

After signing in, `redirectTo` only ever leads to a page of the admin on the same host (`safeRedirectPath` in `utils/redirect-to.ts`). The proxy's `matcher` and `isProxiedPath` in `utils/admin-path.ts` describe the same set of paths, so change them together.

To turn it on:

1. **Domain.** In Vercel, Project → Settings → Domains, add the admin host to this project (same project, production), and point its DNS at Vercel as the page says.
2. **Variables.** Project → Settings → Environment Variables, for Production: `NEXT_PUBLIC_ADMIN_HOST=admin.joanverhulst.com`, and `NEXT_PUBLIC_URL=https://joanverhulst.com` if it isn't there yet. Without the second one, **View site** opens the deployment's `vercel.app` address.
3. **Redeploy.** Both are read when the site is built, so they only count from the next production deployment.

Sign in again on the new address afterwards: the session from `/admin` on the public domain doesn't come along.

To try it locally, set `NEXT_PUBLIC_ADMIN_HOST=admin.localhost:3000` in `.env.local` and open `http://admin.localhost:3000`. `http://localhost:3000/admin` keeps working next to it.

<br>

### **After the import**

The `media` bucket in Supabase Storage is no longer used either: media moved to R2 with the same paths. Empty it once everything on R2 has proven itself.

Once the site shows everything from Supabase, the media folders in `public/assets/images` (`work`, `experiments`, `photography`, `digital-art`, `on-rotation`, `about_thumbnail.png`) and `public/assets/icons` are no longer used, and neither is `scripts/content`. Gear images stay, they're still in code.
