"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { openApp } from "~/utils/app-layer";

type TransitionLinkProps = ComponentProps<typeof Link>;

const TransitionLink = ({
  href,
  children,
  onClick,
  ...props
}: TransitionLinkProps) => {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    // New tabs and windows are left to the browser
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;

    e.preventDefault();
    const hrefString = typeof href === "string" ? href : (href.pathname ?? "/");
    openApp(hrefString, router, "home", e.currentTarget);
  };

  return (
    <Link href={href} onClick={handleClick} scroll={false} {...props}>
      {children}
    </Link>
  );
};

export default TransitionLink;
