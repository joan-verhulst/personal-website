"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { openApp, visitApp } from "~/utils/app-layer";
import { scrollerOf } from "~/utils/footer";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * A link between the blog and its posts. Open over home, the post takes the
 * blog's place in the layer, like one section taking another's, so going
 * back still closes to home. On a page that was loaded directly it opens
 * over that page, out of the link. Either way Eyes hears it came from the
 * blog.
 */
const PostLink = ({ href, onClick, ...props }: Props) => {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (scrollerOf(event.currentTarget)) visitApp(href, router, "blog");
    else openApp(href, router, "blog", event.currentTarget);
  };

  return <Link href={href} scroll={false} onClick={handleClick} {...props} />;
};

export default PostLink;
