"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import SkyCover from "~/modules/blog/components/sky-cover";
import { InkCover } from "~/modules/blog/demos/ink-demos";
import type { Post } from "~/data/posts";

// Posts whose picture is their own shader's work, drawn live, in place of
// their cover
const liveCovers: Record<string, ComponentType> = {
  "distressed-ink": InkCover,
};

interface Props {
  post: Post;
  // In a list or a thumbnail, where a small copy will do
  isSmall?: boolean;
  // How wide it shows, where neither of the above fits
  sizes?: string;
  // Holds still, where the sky would otherwise play: at the top of its own
  // post
  isStill?: boolean;
}

/**
 * A post's picture: its shader's work drawn live, its cover, or for the sky
 * post, the sky over home, its day playing.
 */
const PostCover = ({ post, isSmall = false, sizes, isStill = false }: Props) => {
  const LiveCover = liveCovers[post.slug];
  if (LiveCover) return <LiveCover />;

  return post.cover ? (
    <Image
      src={post.cover}
      alt=""
      fill
      sizes={
        sizes ??
        (isSmall ? "(min-width: 768px) 480px, 100vw" : "(min-width: 1024px) 960px, 100vw")
      }
      className="object-cover"
    />
  ) : (
    <SkyCover className="absolute inset-0" isPlaying={!isStill} />
  );
};

export default PostCover;
