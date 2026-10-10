"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, type PropsWithChildren, useRef } from "react";
import { getSections } from "~/data/sections";
import { siteData } from "~/data/site";
import ContactBanner from "~/modules/contact/components/contact-banner";
import { getContactLinks } from "~/modules/contact/components/contact-modal";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useCurtain } from "~/modules/core/hooks/use-curtain";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";
import { visitApp } from "~/utils/app-layer";
import { scrollerOf } from "~/utils/footer";

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

/**
 * A page with the footer under it. The footer is fixed behind the page, and
 * the page lifts off it when it's pulled past its end, see useCurtain.
 *
 * Fixed works the same whether the page scrolls the window, loaded directly,
 * or the layer's scroller, opened from home.
 */
const PageWithFooter = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  const content = useContent();
  const { about, contact } = content;
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();
  const pathname = usePathname();
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const curtain = useCurtain({
    pageRef,
    footerRef,
    contentRef,
    animationsEnabled,
    onPop: haptic.onClick,
  });

  const toTop = () => {
    curtain.current?.close();
    (scrollerOf(pageRef.current) ?? window).scrollTo({
      top: 0,
      behavior: animationsEnabled ? "smooth" : "auto",
    });
  };

  // Same as the island: from a section, another one takes its place
  const visit = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (href === pathname) toTop();
    else visitApp(href, router);
  };

  // The about photo for now. A footer image of its own would go here
  const image = about.image;
  const contactLinks = getContactLinks(contact);

  return (
    <>
      {/* Above the footer and opaque. Its bottom corners round as it lifts */}
      <main
        ref={pageRef}
        className={cn(
          "relative z-1 rounded-b-(--curtain-radius) bg-neutral-50",
          className,
        )}
      >
        {children}
      </main>

      {/* Tabbing into it while the page still covers it lifts the page */}
      <footer
        ref={footerRef}
        onFocus={() => curtain.current?.open()}
        className="fixed inset-x-0 bottom-0 z-0 overflow-hidden bg-neutral-900 text-neutral-50"
      >
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="640px"
            // Scaled up so the blur doesn't fade out at the edges
            className="scale-125 object-cover blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-neutral-950/50" />

        {/* The top padding holds CURTAIN_ROOM over the visible 64px, which
            the page's corners and its spring show. The bottom padding keeps
            the last row clear of the settings button, which floats over the
            bottom right corner */}
        <div
          ref={contentRef}
          className="relative flex flex-col gap-10 px-5 pt-40 pb-20 md:gap-14 md:px-8"
        >
          <ContactBanner pathname={pathname} />

          <div className="flex flex-wrap justify-between gap-x-12 gap-y-8">
            <div className="flex min-w-0 max-w-[32ch] flex-col gap-3">
              <h2 className="text-balance text-4xl leading-[0.95] tracking-[-0.03em] md:text-6xl">
                {siteData.owner.name}
              </h2>
              {about.headline && (
                <p className="text-neutral-50/80 text-sm leading-normal">
                  {about.headline}
                </p>
              )}
            </div>

            <nav
              aria-label="Footer"
              className="flex flex-wrap gap-x-10 gap-y-6 text-sm"
            >
              <div className="flex flex-col gap-2">
                <h3 className="mb-1 text-neutral-50/60 text-xs">
                  Work
                </h3>
                {getSections(content).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    scroll={false}
                    aria-current={href === pathname ? "page" : undefined}
                    onClick={(event) => visit(event, href)}
                    className="underline-offset-3 hover:underline"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {contactLinks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="mb-1 text-neutral-50/60 text-xs">
                    Elsewhere
                  </h3>
                  {contactLinks.map(({ id, service, href, isExternal }) => (
                    <a
                      key={id}
                      href={href}
                      {...(isExternal && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                      className="underline-offset-3 hover:underline"
                    >
                      {service}
                    </a>
                  ))}
                </div>
              )}

              {about.currently && (
                <div className="flex flex-col gap-2">
                  <h3 className="mb-1 text-neutral-50/60 text-xs">
                    Currently
                  </h3>
                  {about.currently.url ? (
                    <a
                      href={about.currently.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-3 hover:underline"
                    >
                      {about.currently.name}
                    </a>
                  ) : (
                    <span>{about.currently.name}</span>
                  )}
                  {about.currently.since && (
                    <span className="text-neutral-50/60 text-xs">
                      {about.currently.since}
                    </span>
                  )}
                </div>
              )}
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-neutral-50/70 text-sm">
            <span>
              © {new Date().getFullYear()} {siteData.owner.name}
            </span>
            <button
              type="button"
              onClick={toTop}
              className="cursor-pointer rounded-xl bg-neutral-50/14 px-3 py-2 text-neutral-50 transition-colors duration-200 hover:bg-neutral-50/24"
            >
              Back to top ↑
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PageWithFooter;
