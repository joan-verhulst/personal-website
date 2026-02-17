"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { navigateWithTransition } from "~/utils/page-transition";

type TransitionLinkProps = ComponentProps<typeof Link>;

/**
 * A wrapper around Next.js Link that triggers page transitions.
 * Uses View Transitions API for smooth animated navigation.
 */
const TransitionLink = ({
  href,
  children,
  onClick,
  ...props
}: TransitionLinkProps) => {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Call original onClick if provided
    onClick?.(e);

    // Navigate with transition
    const hrefString = typeof href === "string" ? href : (href.pathname ?? "/");
    navigateWithTransition(hrefString, router);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};

export default TransitionLink;
