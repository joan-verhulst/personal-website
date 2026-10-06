import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import AdminLink from "~/modules/cms/components/admin-link";
import Badge from "~/modules/cms/components/badge";
import Header from "~/modules/cms/components/header";
import Panel from "~/modules/cms/components/panel";
import { sidebarSections } from "~/modules/cms/components/sidebar/sections";
import StatCard from "~/modules/cms/components/stat-card";
import { readContentCounts } from "~/modules/cms/utils/read-site";

export const metadata: Metadata = { title: "Dashboard" };

const plural = (total: number, one: string, many: string) =>
  `${total} ${total === 1 ? one : many}`;

const descriptions: Record<string, string> = {
  "/admin/ui-ux": "The wall of projects: screenshots, videos and their tags.",
  "/admin/digital-art": "Artworks in the digital art gallery.",
  "/admin/photography": "Photos in the table on the photography page.",
  "/admin/on-rotation": "Records on the favorites shelf.",
  "/admin/about": "Headline, intro, photo and the Currently card.",
  "/admin/contact": "The Instagram, LinkedIn and email links.",
  "/admin/media": "Every image and video, its size, and the free storage left.",
  "/admin/security": "The authenticator apps that sign you in.",
};

const AdminHome = async () => {
  const { items, photos, artworks, records } = await readContentCounts();

  // Only collections get a count; the pages under Site are a single page each
  const counts: Record<string, string> = {
    "/admin/ui-ux": plural(items, "item", "items"),
    "/admin/digital-art": plural(artworks, "artwork", "artworks"),
    "/admin/photography": plural(photos, "photo", "photos"),
    "/admin/on-rotation": plural(records, "record", "records"),
  };

  // The same groups as the sidebar, without the dashboard itself
  const groups = sidebarSections.filter((section) => section.label);

  return (
    <>
      {/* View site and Refresh site are in the sidebar, on every page */}
      <Header
        title="Dashboard"
        description="Everything on the site. Saving publishes straight away: the next visit sees the change."
        stats={
          <>
            <StatCard
              label="UI/UX items"
              value={items}
              href="/admin/ui-ux/items"
            />
            <StatCard label="Photos" value={photos} href="/admin/photography" />
            <StatCard
              label="Artworks"
              value={artworks}
              href="/admin/digital-art"
            />
            <StatCard label="Records" value={records} href="/admin/on-rotation" />
          </>
        }
      />

      {groups.map((section) => (
        <Panel key={section.id} title={section.label}>
          {/* As many columns as fit the container, whatever the sidebar takes */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {section.items.map(({ url, label, icon: Icon }) => (
              <li key={url} className="flex min-w-0">
                <AdminLink
                  href={url}
                  className="group flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-neutral-950/10 bg-white p-4 transition-colors duration-200 hover:border-neutral-950/20 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-50 text-primary-500"
                    >
                      <Icon size={16} />
                    </span>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-neutral-400 transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-950"
                    />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-950 text-sm">
                        {label}
                      </span>
                      {counts[url] && (
                        <Badge tone="primary">{counts[url]}</Badge>
                      )}
                    </span>
                    <span className="text-neutral-600 text-xs leading-normal">
                      {descriptions[url]}
                    </span>
                  </span>
                </AdminLink>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
};

export default AdminHome;
