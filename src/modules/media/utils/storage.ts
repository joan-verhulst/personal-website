import { AwsClient } from "aws4fetch";

// The media bucket on Cloudflare R2, through its S3 API. The keys can write
// and delete anything in the bucket, so only server actions import this, and
// each one checks requireAdmin first. The browser never sees a key: it gets a
// signed URL for one upload, see signUpload

// A file never changes under its name, a new upload gets a new one, so
// browsers and the CDN may keep it for a year
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// How long a signed upload can start. One that started in time finishes
const UPLOAD_SECONDS = 600;

let bucket: { client: AwsClient; endpoint: string } | undefined;

/** The client and the bucket's address, set up on first use. */
const getBucket = () => {
  if (bucket) return bucket;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET, see docs/05-CMS.md.",
    );
  }

  bucket = {
    client: new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    }),
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
  };
  return bucket;
};

const objectUrl = (endpoint: string, path: string) =>
  `${endpoint}/${path.split("/").map(encodeURIComponent).join("/")}`;

const refused = async (response: Response) =>
  new Error(`R2 answered ${response.status}: ${await response.text()}`);

/**
 * A URL the browser can upload one file to, straight into the bucket, and the
 * headers to send along. The signature covers the path, the type and the
 * size, so the URL takes that one file and nothing else.
 */
export const signUpload = async (path: string, type: string, size: number) => {
  try {
    const { client, endpoint } = getBucket();
    const url = new URL(objectUrl(endpoint, path));
    url.searchParams.set("X-Amz-Expires", String(UPLOAD_SECONDS));

    // The browser sends the length on its own, from the file
    const headers = { "content-type": type, "cache-control": CACHE_CONTROL };
    const signed = await client.sign(url, {
      method: "PUT",
      headers: { ...headers, "content-length": String(size) },
      aws: { signQuery: true, allHeaders: true },
    });
    return { data: { url: signed.url, headers }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/** Stores a file the server has in hand, like a record's cover. */
export const putMedia = async (path: string, body: ArrayBuffer, type: string) => {
  try {
    const { client, endpoint } = getBucket();
    const response = await client.fetch(objectUrl(endpoint, path), {
      method: "PUT",
      body,
      headers: { "content-type": type, "cache-control": CACHE_CONTROL },
    });
    return { error: response.ok ? null : await refused(response) };
  } catch (error) {
    return { error };
  }
};

/**
 * Whether a file is in the bucket, or null when R2 couldn't be asked. A row
 * only gets a path that's checked, so the site never points at nothing.
 */
export const mediaExists = async (path: string) => {
  try {
    const { client, endpoint } = getBucket();
    const response = await client.fetch(objectUrl(endpoint, path), {
      method: "HEAD",
    });
    if (response.ok) return true;
    if (response.status === 404) return false;
    console.error(new Error(`R2 answered ${response.status} for ${path}`));
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Deletes files and returns the ones that went. R2 answers a file that was
 * already gone like one it deleted, which is what a caller wants here. A
 * failure only leaves clutter, so it's logged rather than passed on.
 */
export const deleteMedia = async (paths: string[]) => {
  let client: AwsClient;
  let endpoint: string;
  try {
    ({ client, endpoint } = getBucket());
  } catch (error) {
    console.error(error);
    return [];
  }

  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        const response = await client.fetch(objectUrl(endpoint, path), {
          method: "DELETE",
        });
        if (!response.ok) console.error(await refused(response));
        return response.ok;
      } catch (error) {
        console.error(error);
        return false;
      }
    }),
  );
  return paths.filter((_, index) => results[index]);
};

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const unescapeXml = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => XML_ENTITIES[name]);

const tag = (xml: string, name: string) => {
  const value = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  return value === undefined ? undefined : unescapeXml(value);
};

export interface StoredFile {
  path: string;
  /** In bytes. */
  size: number;
  createdAt: number;
}

/**
 * Every file in the bucket with its size and when it was stored, or null when
 * the listing failed. R2 keeps the time of the last write, so a file copied
 * in from elsewhere counts as new from the day it was copied.
 */
export const listMedia = async () => {
  try {
    const { client, endpoint } = getBucket();
    const files: StoredFile[] = [];

    let token: string | undefined;
    do {
      const url = new URL(endpoint);
      url.searchParams.set("list-type", "2");
      if (token) url.searchParams.set("continuation-token", token);

      const response = await client.fetch(url);
      if (!response.ok) throw await refused(response);
      const xml = await response.text();

      for (const [, entry] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const path = tag(entry, "Key");
        if (path) {
          files.push({
            path,
            size: Number(tag(entry, "Size") ?? 0),
            createdAt: Date.parse(tag(entry, "LastModified") ?? ""),
          });
        }
      }
      token = tag(xml, "NextContinuationToken");
    } while (token);

    return files;
  } catch (error) {
    console.error(error);
    return null;
  }
};
