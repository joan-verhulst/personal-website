import type { RotationTrack } from "~/data/favorites";
import { getContent } from "~/modules/content/utils/get-content";

// Titles, artists and preview links change rarely, so the lookup is kept for
// a day. Only the lookup, not this route's answer: a cached route would hold
// on to a failed answer for that day too, while a failed fetch is never kept
const LOOKUP_SECONDS = 86400;

interface LookupResult {
  wrapperType: string;
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  trackViewUrl: string;
}

// Apple's answer is checked like any other input: only complete songs count
const isTrack = (result: unknown): result is LookupResult => {
  if (typeof result !== "object" || result === null) return false;
  const track = result as Record<string, unknown>;
  return (
    track.wrapperType === "track" &&
    typeof track.trackId === "number" &&
    typeof track.trackName === "string" &&
    typeof track.artistName === "string" &&
    typeof track.previewUrl === "string" &&
    typeof track.trackViewUrl === "string"
  );
};

// Live recordings carry the venue in their name, e.g. "Come When I Call (Live
// at the Nokia Theatre, ...)". The record already says it's live.
const cleanTitle = (title: string) => title.replace(/\s*\(Live\b.*\)$/i, "");

// The player carries on without sound when this isn't a 200
const unavailable = () => Response.json({}, { status: 502 });

/**
 * The favorite song of every record on rotation, keyed by Apple Music ID.
 * Songs without a preview are left out, the player shows them without sound.
 */
export async function GET() {
  const { records } = await getContent();
  const ids = records.map((record) => record.favoriteSong.appleId);
  if (ids.length === 0) return Response.json({});

  let body: unknown;
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${ids.join(",")}`,
      {
        next: { revalidate: LOOKUP_SECONDS },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return unavailable();
    body = await response.json();
  } catch (error) {
    console.error(error);
    return unavailable();
  }

  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return unavailable();

  const tracks: Record<number, RotationTrack> = {};
  for (const result of results) {
    if (!isTrack(result)) continue;

    tracks[result.trackId] = {
      title: cleanTitle(result.trackName),
      artist: result.artistName,
      previewUrl: result.previewUrl,
      url: result.trackViewUrl,
    };
  }

  return Response.json(tracks);
}
