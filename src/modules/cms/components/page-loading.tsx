import Page from "~/modules/cms/components/page";
import Panel from "~/modules/cms/components/panel";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import PageActions from "~/modules/cms/components/shell/page-actions";

interface PageLoadingProps {
  /** As wide as the page it stands in for. */
  width?: "collection" | "form";
  /** How many sections to show. */
  sections?: number;
  /** A line under the description, like an item's size and tag. */
  hasMeta?: boolean;
  /**
   * Holds the place of the page's buttons in the bottom bar, so the bar's +
   * doesn't show first: "save" for Save alone, "delete" for Delete and Save.
   */
  actions?: "save" | "delete";
}

/**
 * Stands in for a page of sections while it loads: a title, a description
 * and a few containers with lines in them.
 *
 * @example
 * <PageLoading width="form" sections={3} actions="save" />
 */
const PageLoading = ({
  width = "collection",
  sections = 3,
  hasMeta,
  actions,
}: PageLoadingProps) => (
  <Page width={width} aria-busy aria-live="polite">
    <span className="sr-only">Loading…</span>
    {/* The header's own spacing, see <Header /> */}
    <div className="mb-2 flex flex-col gap-2 md:mb-4">
      <Skeleton className="h-6 w-56 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
      {hasMeta && <Skeleton className="mt-1 h-4 w-40" />}
    </div>
    {Array.from({ length: sections }, (_, index) => index).map((section) => (
      <Panel key={section}>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-[35px] w-full rounded-xl" />
        <Skeleton className="h-[35px] w-full rounded-xl" />
      </Panel>
    ))}
    {actions && (
      <PageActions>
        {actions === "delete" && (
          <Skeleton className="h-[33px] w-20 rounded-[10px]" />
        )}
        <Skeleton className="h-[33px] w-16 rounded-full" />
      </PageActions>
    )}
  </Page>
);

export default PageLoading;
