"use client";

import { ArrowRight } from "lucide-react";
import { ownPages } from "~/data/pages";
import {
  blogHero,
  type Post,
  type PostSection,
  postSections,
  posts,
} from "~/data/posts";
import PostCover from "~/modules/blog/components/post-cover";
import PostLink from "~/modules/blog/components/post-link";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";

// One inset from the card's left, bottom and right edges to what you read:
// the title, the section and the arrow. The 32px row centres them, so its
// bottom and right sit half a rem further out, and the faint outlines of the
// section pill and the arrow hang just outside the line
const INSET = "pl-[clamp(1.25rem,6cqw,3rem)] pr-[calc(clamp(1.25rem,6cqw,3rem)-0.5rem)] pb-[calc(clamp(1.25rem,6cqw,3rem)-0.5rem)]";

const TEXT = "mx-auto max-w-3xl px-2";

const PostTile = ({ post }: { post: Post }) => {
  const haptic = useHapticSound();

  return (
    <PostLink
      href={`${ownPages.blog.path}/${post.slug}`}
      onClick={haptic.onClick}
      onMouseEnter={haptic.onMouseEnter}
      className="group @container relative inset-border block aspect-4/3 w-full overflow-hidden rounded-4xl bg-neutral-900 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 md:aspect-21/9"
    >
      <span className="absolute inset-0 overflow-hidden">
        <PostCover post={post} sizes="(min-width: 1200px) 1152px, 100vw" />
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-neutral-950/35 to-transparent" />
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-center gap-2",
          INSET,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[clamp(0.875rem,2.5cqw,1.125rem)] text-neutral-50">
          {post.title}
        </span>
        <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-neutral-50/20 px-3 text-neutral-50 text-sm transition-colors duration-300 group-hover:bg-neutral-50/15">
          {postSections[post.section].title}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-50/20 text-neutral-50 transition-colors duration-300 group-hover:bg-neutral-50/15">
          <ArrowRight className="size-4" />
        </span>
      </span>
    </PostLink>
  );
};

// The kinds of posts that have one, in their order
const sections = (
  Object.entries(postSections) as [
    PostSection,
    (typeof postSections)[PostSection],
  ][]
).filter(([key]) => posts.some((post) => post.section === key));

const BlogIndex = () => {
  return (
    <div className="px-3 pt-24 pb-64 md:px-4 md:pt-49 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <header className={TEXT}>
          <h1 className="text-balance text-2xl text-neutral-950 leading-tight tracking-[-0.01em] md:text-3xl">
            {blogHero.title}
          </h1>
          <p className="mt-3 text-pretty font-light text-lg text-neutral-950/66">
            {blogHero.description}
          </p>
        </header>

        {sections.map(([key, section]) => (
          <section key={key} aria-labelledby={`blog-${key}`} className="mt-24">
            <header className={TEXT}>
              <h2
                id={`blog-${key}`}
                className="text-balance text-neutral-950 text-xl leading-snug md:text-2xl"
              >
                {section.title}
              </h2>
              <p className="mt-1 text-pretty font-light text-lg text-neutral-950/66">
                {section.description}
              </p>
            </header>
            <div className="mt-16 flex flex-col gap-3">
              {posts
                .filter((post) => post.section === key)
                .map((post) => (
                  <PostTile key={post.slug} post={post} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default BlogIndex;
