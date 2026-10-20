"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  FastForward,
  type LucideIcon,
  Moon,
  Sun,
} from "lucide-react";
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
import { useSky } from "~/modules/core/hooks/use-sky";
import { useThreeD } from "~/modules/core/hooks/use-three-d";
import {
  CONDITION_LABELS,
  type SkyCondition,
} from "~/modules/core/utils/weather";
import { visitApp } from "~/utils/app-layer";
import cn from "~/utils/cn";
import { track } from "~/utils/eyes";
import { scrollerOf } from "~/utils/footer";

const CONDITION_ICONS: Record<SkyCondition, [LucideIcon, LucideIcon]> = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  fog: [CloudFog, CloudFog],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  thunder: [CloudLightning, CloudLightning],
};

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

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
  const skyRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  const isThreeD = useThreeD();
  const sky = useSky({
    skyRef,
    clockRef,
    animationsEnabled,
    isThreeD,
    // The hover click: softer, and sound only, never a buzz on a phone
    onHour: haptic.onMouseEnter,
  });

  const curtain = useCurtain({
    pageRef,
    footerRef,
    contentRef,
    animationsEnabled,
    onPop: haptic.onClick,
    onOpen: () => track("Contact Opened", { from: "footer" }),
    onDraw: sky.refresh,
  });

  const toTop = () => {
    curtain.current?.close();
    (scrollerOf(pageRef.current) ?? window).scrollTo({
      top: 0,
      behavior: animationsEnabled ? "smooth" : "auto",
    });
  };

  const visit = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (href === pathname) toTop();
    else visitApp(href, router, "footer");
  };

  const contactLinks = getContactLinks(contact);

  const Condition = CONDITION_ICONS[sky.condition][sky.isNight ? 1 : 0];
  const status = (
    <>
      <Condition aria-hidden className="size-4" />
      <span>{siteData.owner.home.name}</span>
      <span ref={clockRef} className="tabular-nums" />
      <span className="text-neutral-50/60">
        {CONDITION_LABELS[sky.condition]}
      </span>
    </>
  );

  return (
    <>
      <main
        ref={pageRef}
        className={cn(
          "relative z-1 rounded-b-(--curtain-radius) bg-neutral-50",
          className,
        )}
      >
        {children}
      </main>

      <footer
        ref={footerRef}
        onFocus={() => curtain.current?.open()}
        data-glass-on={sky.hasGlass ? "" : undefined}
        className="fixed inset-x-0 bottom-0 z-0 overflow-hidden bg-neutral-900 text-neutral-50"
      >
        <div ref={skyRef} className="absolute inset-0 bg-neutral-900" />

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
                      onClick={() =>
                        track("Contact Clicked", { link: id, from: "footer" })
                      }
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                © {new Date().getFullYear()} {siteData.owner.name}
              </span>
              <span>
                Weather from{" "}
                <a
                  href="https://www.buienradar.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-neutral-50 underline-offset-3 hover:underline"
                >
                  Buienradar
                </a>{" "}
                and{" "}
                <a
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-neutral-50 underline-offset-3 hover:underline"
                >
                  Open-Meteo
                </a>
              </span>
            </div>
            <div className="flex gap-2">
              {animationsEnabled ? (
                <button
                  data-glass
                  type="button"
                  aria-label="Play the last 24 hours"
                  title="Play the last 24 hours. Weather from Buienradar and Open-Meteo"
                  disabled={sky.isPlaying}
                  onClick={() => {
                    haptic.onClick();
                    track("Day Played");
                    sky.play();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-50/14 py-2 pr-2.5 pl-3 text-neutral-50 transition-colors duration-200 hover:bg-neutral-50/24 disabled:cursor-default disabled:bg-neutral-50/24"
                >
                  {status}
                  <FastForward aria-hidden className="size-4 text-neutral-50/70" />
                </button>
              ) : (
                <div
                  data-glass
                  title="Weather from Buienradar and Open-Meteo"
                  className="flex items-center gap-2 rounded-xl bg-neutral-50/14 px-3 py-2 text-neutral-50"
                >
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PageWithFooter;
