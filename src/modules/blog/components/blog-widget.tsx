"use client";

import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widget-card";
import { posts } from "~/data/posts";
import { widgets } from "~/data/widgets";
import PostCover from "~/modules/blog/components/post-cover";

// The newest post is the one on home
const [latest] = posts;

/**
 * The blog on home, where the experiments were: the newest post's own
 * cover, as the blog shows it, with a pill saying there is a new post.
 */
const BlogWidget = () => (
  <TransitionLink href="/blog" className="block h-full">
    <WidgetCard label={widgets.blog.label} className="h-full bg-neutral-50">
      <div className="pointer-events-none relative h-full w-full overflow-hidden rounded-4xl bg-neutral-900">
        {latest && <PostCover post={latest} isSmall />}

        {latest && (
          // A short word rather than the title, which runs too long for a pill
          <div className="absolute bottom-4 left-4 flex h-6 items-center rounded-[0.625rem] bg-neutral-950/33 px-2 text-neutral-50 text-sm backdrop-blur-lg">
            New post
          </div>
        )}
      </div>
    </WidgetCard>
  </TransitionLink>
);

export default BlogWidget;
