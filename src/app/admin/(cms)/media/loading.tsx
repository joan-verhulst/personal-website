import CardGrid from "~/modules/cms/components/card-grid";
import Header from "~/modules/cms/components/header";
import { MediaCardSkeleton } from "~/modules/cms/components/media-card";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";

const STATS = ["Files", "Images", "Videos", "Unused"];
const CARDS = Array.from({ length: 8 }, (_, index) => index);

/** The media page's shape while the bucket is listed. */
const MediaLoading = () => (
  <>
    <Header
      title="Media"
      description="Every image and video on the site, as stored on Cloudflare R2. A card opens its file."
      stats={STATS.map((label) => (
        <Skeleton key={label} className="h-[42px] rounded-xl" />
      ))}
    />
    <Skeleton className="h-[148px] rounded-2xl" />
    <div className="flex justify-end gap-2">
      <Skeleton className="h-[35px] w-40 rounded-xl" />
      <Skeleton className="h-[35px] w-32 rounded-xl" />
      <Skeleton className="h-[35px] w-36 rounded-xl" />
    </div>
    <CardGrid aria-busy aria-live="polite">
      <span className="sr-only">Loading…</span>
      {CARDS.map((card) => (
        <MediaCardSkeleton key={card} />
      ))}
    </CardGrid>
  </>
);

export default MediaLoading;
