"use client";

import { ArrowUpRight, LoaderCircle, RefreshCw } from "lucide-react";
import { refreshSite } from "~/modules/cms/actions/site";
import { useAdminPath } from "~/modules/cms/components/admin-path";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/modules/cms/components/primitives/tooltip";
import { useAction } from "~/modules/cms/hooks/use-action";

const ROW =
  "flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-[10px] py-2 text-left text-neutral-950 text-sm transition-colors duration-200 hover:bg-neutral-950/5 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:cursor-wait";

/** Rows above the navigation for things that aren't a page in the CMS. */
const QuickActions = () => {
  const { run, isPending } = useAction();
  // A full address on the admin host, where "/" is the dashboard
  const { siteUrl } = useAdminPath();

  return (
    <ul className="flex flex-col">
      <li>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={ROW}
        >
          <ArrowUpRight size={16} aria-hidden />
          View site
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </li>
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              className={ROW}
              // For changes made outside the CMS, which the site doesn't know about
              onClick={() =>
                run(refreshSite, "The site will show the latest content")
              }
            >
              {isPending ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
              {isPending ? "Refreshing…" : "Refresh site"}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Use after editing content in the Supabase dashboard
          </TooltipContent>
        </Tooltip>
      </li>
    </ul>
  );
};

export default QuickActions;
