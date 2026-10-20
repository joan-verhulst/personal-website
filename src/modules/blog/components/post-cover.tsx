"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import SkyCover from "~/modules/blog/components/sky-cover";
import { InkCover } from "~/modules/blog/demos/ink-demos";
import type { Post } from "~/data/posts";

const liveCovers: Record<string, ComponentType> = {
  "distressed-ink": InkCover,
};

interface Props {
  post: Post;
  isSmall?: boolean;
  sizes?: string;
  // Holds still, where the sky would otherwise play: at the top of its own
  // post
  isStill?: boolean;
}

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
