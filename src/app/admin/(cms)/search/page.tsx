import type { Metadata } from "next";
import { pages } from "~/data/pages";
import { siteData } from "~/data/site";
import SearchForm from "~/modules/cms/components/search-form";
import { readSite } from "~/modules/cms/utils/read-site";
import type { PageKey } from "~/modules/content/types";
import { getContent } from "~/modules/content/utils/get-content";
import { fallbackDescription } from "~/utils/page-metadata";

export const metadata: Metadata = { title: "Search" };

const KEYS = Object.keys(pages) as PageKey[];

// The form renders the whole page: its header, and Save in the bottom bar
const SearchAdmin = async () => {
  // The fallbacks come from what the site shows, like the about headline
  const [site, content] = await Promise.all([readSite(), getContent()]);
  const fallbacks = Object.fromEntries(
    KEYS.map((key) => [key, fallbackDescription(key, content)]),
  ) as Record<PageKey, string>;
  const titles = Object.fromEntries(
    KEYS.map((key) => [
      key,
      key === "home"
        ? pages.home.title
        : siteData.metadata.titleTemplate.replace("%s", pages[key].title),
    ]),
  ) as Record<PageKey, string>;

  return <SearchForm site={site} fallbacks={fallbacks} titles={titles} />;
};

export default SearchAdmin;
