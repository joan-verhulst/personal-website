// The blog's posts, newest first. They're written by hand in code, each with
// its own demos, see modules/blog/posts. Not in the CMS

// At the top of the list
export const blogHero = {
  title: "How it's made",
  description:
    "A collection of articles, experiments, and ideas exploring design, technology, creativity, and the process of making things. Notes on projects, things I've learned, techniques I've explored, and ideas worth sharing.",
};

// The kinds of posts, each its own section of the list, in this order
export const postSections = {
  shaders: {
    title: "Shaders",
    description:
      "Effects drawn by the graphics card, pixel by pixel, from a sky built out of noise to a print look that started in Photoshop.",
  },
};

export type PostSection = keyof typeof postSections;

export interface Post {
  slug: string;
  title: string;
  // The section of the list it's in
  section: PostSection;
  // Under the title, and in the list
  summary: string;
  // ISO date, shown as "19 October 2026"
  date: string;
  minutes: number;
  // Fills its tile in the list and the home widget, unless PostCover draws
  // one live. A post without one shows the live sky instead
  cover?: string;
}

export const posts: Post[] = [
  {
    slug: "cloud-shader",
    title: "Building a procedural cloud sky shader",
    section: "shaders",
    summary:
      "Using procedural noise, atmospheric scattering and cloud lighting to create a real-time sky that adapts to the sun, wind and changing weather, from clear skies to thunderstorms.",
    date: "2026-10-19",
    minutes: 8,
  },
  {
    slug: "distressed-ink",
    title: "Recreating distressed ink print textures with shaders",
    section: "shaders",
    summary:
      "Turning a Photoshop effect into a real-time shader that transforms photographs into grainy, distressed prints with uneven ink, rough edges and adjustable textures.",
    date: "2026-10-19",
    minutes: 4,
    cover: "/blog/ink-shader.jpg",
  },
];

export const postAt = (slug: string) => posts.find((post) => post.slug === slug);

export const formatPostDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
