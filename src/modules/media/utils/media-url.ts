import { env } from "~/env";

const PUBLIC_PREFIX = `${env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/`;

export const mediaUrl = (path: string) =>
  `${PUBLIC_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;

export const optionalMediaUrl = (path: string | null | undefined) =>
  path ? mediaUrl(path) : undefined;
