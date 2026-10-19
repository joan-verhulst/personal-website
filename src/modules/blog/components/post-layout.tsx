"use client";

import { ArrowLeft } from "lucide-react";
import { type PropsWithChildren, type ReactNode, useEffect } from "react";
import PostCover from "~/modules/blog/components/post-cover";
import PostLink from "~/modules/blog/components/post-link";
import { Prose } from "~/modules/blog/components/prose";
import { ownPages } from "~/data/pages";
import { formatPostDate, type Post, posts } from "~/data/posts";
import { siteData } from "~/data/site";
import { track } from "~/utils/eyes";

interface Props {
  post: Post;
  // At the top in place of the cover, like a demo, see postHeroes
  hero?: ReactNode;
}

/**
 * A post: its title, what it's about and when, its cover, then the writing
 * with its demos, and the other posts to read next.
 */
const PostLayout = ({ post, hero, children }: PropsWithChildren<Props>) => {
  const others = posts.filter(({ slug }) => slug !== post.slug);

  useEffect(() => {
    track("Post Opened", { post: post.slug });
  }, [post.slug]);

  return (
    <article className="pb-32">
      <header className="mx-auto w-[min(38rem,calc(100%-2.5rem))] pt-24 md:pt-49">
        <PostLink
          href={ownPages.blog.path}
          className="inline-flex items-center gap-1.5 text-neutral-950/50 text-sm transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="size-3.5" />
          All posts
        </PostLink>
        <h1 className="mt-8 text-balance text-2xl text-neutral-950 leading-tight tracking-[-0.01em] md:text-3xl">
          {post.title}
        </h1>
        <p className="mt-3 text-pretty font-light text-base text-neutral-950/66">
          {post.summary}
        </p>
        <p className="mt-4 flex gap-2 text-neutral-950/50 text-xs">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.minutes} min read</span>
        </p>
      </header>

      <div className="inset-border mx-auto my-32 w-[min(60rem,calc(100%-2rem))] overflow-hidden rounded-4xl">
        <div className="relative aspect-2/1">
          {hero ?? <PostCover post={post} isStill />}
        </div>
      </div>

      <Prose isRoomy>
        {children}
        <p className="mt-10! text-neutral-950/60">
          – {siteData.owner.name.split(" ")[0]}
        </p>
      </Prose>

      {others.length > 0 && (
        <nav
          aria-label="More posts"
          className="mx-auto mt-20 w-[min(38rem,calc(100%-2.5rem))]"
        >
          <span className="text-neutral-950/50 text-xs">Read next</span>
          <div className="relative inset-border mt-3 flex flex-col gap-4 rounded-3xl bg-neutral-50 p-5">
            {others.map((other) => (
              <PostLink
                key={other.slug}
                href={`${ownPages.blog.path}/${other.slug}`}
                className="group flex items-center gap-4"
              >
                <span className="relative inset-border aspect-4/3 w-24 shrink-0 overflow-hidden rounded-2xl">
                  <PostCover post={other} isSmall />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-base text-neutral-950 group-hover:underline group-hover:decoration-neutral-950/25 group-hover:underline-offset-3">
                    {other.title}
                  </span>
                  <span className="line-clamp-2 font-light text-neutral-950/60 text-sm">
                    {other.summary}
                  </span>
                </span>
              </PostLink>
            ))}
          </div>
        </nav>
      )}
    </article>
  );
};

export default PostLayout;
