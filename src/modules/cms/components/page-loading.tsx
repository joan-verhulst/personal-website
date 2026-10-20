import Page from "~/modules/cms/components/page";
import Panel from "~/modules/cms/components/panel";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import PageActions from "~/modules/cms/components/shell/page-actions";

interface PageLoadingProps {
  width?: "collection" | "form";
  sections?: number;
  hasMeta?: boolean;
  actions?: "save" | "delete";
}

const PageLoading = ({
  width = "collection",
  sections = 3,
  hasMeta,
  actions,
}: PageLoadingProps) => (
  <Page width={width} aria-busy aria-live="polite">
    <span className="sr-only">Loading…</span>
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
