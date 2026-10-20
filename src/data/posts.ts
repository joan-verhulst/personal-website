
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
      "Visual effects I built as shaders, how each one works and how I got there, with demos you can play with along the way.",
  },
  design: {
    title: "Design systems",
    description:
      "How the products I design are put together, measured down to the padding.",
  },
};

export type PostSection = keyof typeof postSections;

export interface Post {
  slug: string;
  title: string;
  section: PostSection;
  summary: string;
  date: string;
  minutes: number;
  // Fills its tile in the list and the home widget, unless PostCover draws
  // one live. A post without one shows the live sky instead
  cover?: string;
}

export const posts: Post[] = [
  {
    slug: "design-system",
    title: "The design system I've built over the years",
    section: "design",
    summary:
      "Finding the system in screens from five products, and rebuilding it on Radix with tokens that swap per product, measured component by component.",
    date: "2026-10-20",
    minutes: 5,
  },
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
