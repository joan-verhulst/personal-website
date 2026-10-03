import type { RotationTrack } from "~/data/favorites";
import { getContent } from "~/modules/content/utils/get-content";

// Titles, artists and preview links change rarely, so look them up once a day
export const revalidate = 86400;

interface LookupResult {
  wrapperType: string;
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  trackViewUrl: string;
}

// Live recordings carry the venue in their name, e.g. "Come When I Call (Live
// at the Nokia Theatre, ...)". The record already says it's live.
const cleanTitle = (title: string) => title.replace(/\s*\(Live\b.*\)$/i, "");

/**
 * The favorite song of every record on rotation, keyed by Apple Music ID.
 * Songs without a preview are left out, the player shows them without sound.
 */
export async function GET() {
  const { records } = await getContent();
  const ids = records.map((record) => record.favoriteSong.appleId);
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${ids.join(",")}`,
  );

  if (!response.ok) {
    return Response.json({}, { status: 502 });
  }

  const { results } = (await response.json()) as { results: LookupResult[] };
  const tracks: Record<number, RotationTrack> = {};

  for (const result of results) {
    if (result.wrapperType !== "track" || !result.previewUrl) continue;

    tracks[result.trackId] = {
      title: cleanTitle(result.trackName),
      artist: result.artistName,
      previewUrl: result.previewUrl,
      url: result.trackViewUrl,
    };
  }

  return Response.json(tracks);
}
