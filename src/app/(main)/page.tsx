"use client";

import { gsap } from "gsap";
import { Dot } from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ownPages } from "~/data/pages";
import { siteData } from "~/data/site";
import { widgets } from "~/data/widgets";
import BlogWidget from "~/modules/blog/components/blog-widget";
import { getContactLinks } from "~/modules/contact/components/contact-modal";
import { useContent } from "~/modules/content/components/content-provider";
import Vinyl from "~/modules/favorites/components/vinyl";
import ProductsWidget from "~/modules/products/components/products-widget";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import { openContact } from "~/utils/open-contact";
import { openWidget } from "~/utils/open-widget";
import PageWithFooter from "~components/layout/footer";
import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widget-card";

const Page = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const projectsSlideRef = useRef<HTMLDivElement>(null);
  const snippetsSlideRef = useRef<HTMLDivElement>(null);
  const indicator1Ref = useRef<HTMLDivElement>(null);
  const indicator2Ref = useRef<HTMLDivElement>(null);
  const projectsTextRef = useRef<HTMLSpanElement>(null);
  const snippetsTextRef = useRef<HTMLSpanElement>(null);
  const slideTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const [activeSlide, setActiveSlide] = useState(0); // 0 for projects, 1 for snippets

  const { about, contact, covers, highlights, products, records } =
    useContent();
  // Two pieces from the UI/UX wall rotate in the widget
  const [firstHighlight, secondHighlight = firstHighlight] = highlights;
  // The record that's on spins on the On Rotation widget
  const [currentRecord] = records;

  // The intro, once per visit: the grid zooms out into place while the
  // widgets come in one by one. The script in the root layout decides whether
  // it plays and hides them before the first paint, see INTRO_SCRIPT, so
  // they're never seen in place first
  useLayoutEffect(() => {
    const root = document.documentElement;
    const grid = gridRef.current;
    if (!grid || root.dataset.intro !== "pending") return;
    sessionStorage.setItem("has-seen-intro", "true");

    const tiles = grid.querySelectorAll<HTMLElement>("[data-tile]");
    // Hidden inline from here on, so the stylesheet can let go
    gsap.set(tiles, { opacity: 0, scale: 0.9 });
    delete root.dataset.intro;

    // Only transforms move, never the layout, and nothing overshoots: the
    // grid slows into its place instead of bouncing past it
    const timeline = gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .fromTo(
        grid,
        { scale: 2.5 },
        { scale: 1, duration: 1, clearProps: "transform" },
      )
      .to(
        tiles,
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.06,
          clearProps: "opacity,transform",
        },
        0.1,
      );

    return () => {
      // Interrupted before it finished, as React does once in development:
      // hand the intro back, so the next mount plays it from the start
      if (timeline.progress() < 1) {
        root.dataset.intro = "pending";
        sessionStorage.removeItem("has-seen-intro");
      }
      timeline.kill();
      gsap.set([grid, ...tiles], { clearProps: "opacity,transform" });
    };
  }, []);

  // Function to animate to a specific slide
  const animateToSlide = (targetSlide: number) => {
    if (targetSlide === activeSlide) return;

    slideTimelineRef.current?.kill();

    const currentSlide =
      activeSlide === 0 ? projectsSlideRef.current : snippetsSlideRef.current;
    const nextSlide =
      targetSlide === 0 ? projectsSlideRef.current : snippetsSlideRef.current;
    const currentIndicator =
      activeSlide === 0 ? indicator1Ref.current : indicator2Ref.current;
    const nextIndicator =
      targetSlide === 0 ? indicator1Ref.current : indicator2Ref.current;
    const currentText =
      activeSlide === 0 ? projectsTextRef.current : snippetsTextRef.current;
    const nextText =
      targetSlide === 0 ? projectsTextRef.current : snippetsTextRef.current;

    if (
      !currentSlide ||
      !nextSlide ||
      !currentIndicator ||
      !nextIndicator ||
      !currentText ||
      !nextText
    )
      return;

    const timeline = gsap.timeline({
      onComplete: () => {
        setActiveSlide(targetSlide);
      },
    });
    slideTimelineRef.current = timeline;

    // Step 1: Scale down the active slide
    timeline.to(currentSlide, {
      scale: 0.9,
      duration: 0.3,
      ease: "power2.inOut",
    });

    // Step 2: Move out the active slide upwards
    timeline.to(
      currentSlide,
      {
        y: "-100%",
        duration: 0.4,
        ease: "power2.inOut",
      },
      "-=0.1",
    );

    // Step 3: Set initial position for incoming slide and move it in
    timeline.fromTo(
      nextSlide,
      {
        y: "100%",
        scale: 0.9,
      },
      {
        y: "0%",
        duration: 0.4,
        ease: "power2.inOut",
      },
      "-=0.2",
    );

    // Step 4: Scale up the new active slide
    timeline.to(
      nextSlide,
      {
        scale: 1,
        duration: 0.3,
        ease: "power2.inOut",
      },
      "-=0.1",
    );

    // Animate indicators
    timeline.to(
      currentIndicator,
      {
        backgroundColor: "rgba(10, 10, 10, 0.33)", // neutral-950/33
        duration: 0.3,
        ease: "power2.inOut",
      },
      "-=0.6",
    );

    timeline.to(
      nextIndicator,
      {
        backgroundColor: "rgba(10, 10, 10, 1)", // neutral-950
        duration: 0.3,
        ease: "power2.inOut",
      },
      "-=0.3",
    );

    // Animate text opacity
    timeline.to(
      currentText,
      {
        opacity: 0.66,
        duration: 0.3,
        ease: "power2.inOut",
      },
      "-=0.6",
    );

    timeline.to(
      nextText,
      {
        opacity: 1,
        duration: 0.3,
        ease: "power2.inOut",
      },
      "-=0.3",
    );
  };

  // Slide animation every 5 seconds
  // biome-ignore lint/correctness/useExhaustiveDependencies: animateToSlide is new every render. The timer starts over with each slide, which is when what it reads changes
  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = activeSlide === 0 ? 1 : 0;
      animateToSlide(nextSlide);
    }, 5000);

    return () => {
      clearInterval(interval);
      slideTimelineRef.current?.kill();
    };
  }, [activeSlide]);

  return (
    <PageWithFooter className="min-h-screen">
      {/* The widgets say what's here, this says whose it is, for search */}
      <h1 className="sr-only">{siteData.owner.name}</h1>
      <div className="z-10 flex min-h-screen items-center justify-center px-16 py-24 md:h-screen md:px-0 md:py-0">
        <div className="w-full md:w-3xl">
          {/* Main grid - mobile: single column, desktop: 2 equal-height rows */}
          <div
            ref={gridRef}
            data-intro-grid
            className="grid grid-cols-1 md:h-full md:grid-rows-2"
            style={{ gap: "3rem" }}
          >
            {/* TOP ROW WRAPPER */}
            <div
              className="grid grid-cols-1 md:h-full md:grid-cols-3"
              style={{ gap: "2rem" }}
            >
              {/* TOP ROW - Column 1: About + On Rotation/Gear subgrid. About
                  opens its page, the record and the gear their modals */}
              <div
                className="grid aspect-square w-full grid-cols-1"
                style={{ gap: "2rem" }}
              >
                {/* About */}
                <TransitionLink
                  href={ownPages.about.path}
                  className="block aspect-2/1 md:h-full"
                >
                  <WidgetCard
                    label={widgets.about.label}
                    src={about.image}
                    alt={widgets.about.alt}
                    className="h-full bg-neutral-400"
                  />
                </TransitionLink>

                {/* On Rotation + Gear in a row */}
                <div
                  className="grid grid-cols-2 md:h-full"
                  style={{ gap: "2rem" }}
                >
                  {/* On Rotation */}
                  <div className="aspect-square md:aspect-auto md:h-full">
                    <WidgetCard
                      label={widgets.onRotation.label}
                      className="h-full bg-linear-to-b from-[#EBCA10] to-[#EB7E10]"
                      onClick={() => openWidget("on-rotation", "home")}
                    >
                      <div className="pointer-events-none flex h-full items-center justify-center">
                        {currentRecord && (
                          <Vinyl
                            covers={[
                              {
                                id: currentRecord.id,
                                src: currentRecord.cover,
                                alt: `${currentRecord.title} by ${currentRecord.artist}`,
                              },
                            ]}
                            activeId={currentRecord.id}
                            sizes="48px"
                            speed={6}
                            className="h-[78%]"
                          />
                        )}
                      </div>
                    </WidgetCard>
                  </div>

                  {/* Gear: the camera is a cut-out, shown whole */}
                  <div className="aspect-square md:aspect-auto md:h-full">
                    <WidgetCard
                      label={widgets.gear.label}
                      className="h-full bg-linear-to-b from-[#626D77] to-[#1E2D3C]"
                      onClick={() => openWidget("gear", "home")}
                    >
                      <div className="relative h-full overflow-hidden rounded-4xl">
                        <Image
                          src={widgets.gear.image}
                          alt=""
                          fill
                          sizes="96px"
                          className="pointer-events-none object-contain p-[14%]"
                        />
                      </div>
                    </WidgetCard>
                  </div>
                </div>
              </div>

              {/* TOP ROW - Columns 2-3: UI/UX spanning 2 columns */}
              <TransitionLink
                href="/ui-ux"
                className="relative block aspect-2/1 md:col-span-2 md:h-full"
              >
                <WidgetCard
                  label={widgets.uiux.label}
                  className="h-full bg-neutral-50"
                >
                  {/* Slides wrapper with overflow hidden */}
                  <div className="relative h-full w-full overflow-hidden rounded-2xl">
                    {/* First highlight slide */}
                    <div
                      ref={projectsSlideRef}
                      className="absolute inset-0 rounded-4xl"
                      style={{
                        background: firstHighlight && getWallBackground(firstHighlight),
                      }}
                    >
                      <div className="absolute inset-0 px-12 pt-8">
                        <div className="relative inset-border h-full overflow-hidden rounded-t-2xl">
                          {firstHighlight && (
                            <Image
                              src={firstHighlight.media.src}
                              alt={firstHighlight.title}
                              fill
                              sizes="(min-width: 768px) 512px, 100vw"
                              className="pointer-events-none object-cover object-top"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Second highlight slide */}
                    <div
                      ref={snippetsSlideRef}
                      className="absolute inset-0 -translate-y-full rounded-4xl"
                      style={{
                        background: secondHighlight && getWallBackground(secondHighlight),
                      }}
                    >
                      <div className="absolute inset-0 px-12 pt-8">
                        <div className="relative inset-border h-full overflow-hidden rounded-t-2xl">
                          {secondHighlight && (
                            <Image
                              src={secondHighlight.media.src}
                              alt={secondHighlight.title}
                              fill
                              sizes="(min-width: 768px) 512px, 100vw"
                              className="pointer-events-none object-cover object-top"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute right-0 bottom-4 left-0 flex justify-center">
                    <div className="flex h-6 items-center rounded-[0.625rem] bg-neutral-950/33 px-2 backdrop-blur-lg">
                      <span
                        ref={projectsTextRef}
                        className="text-neutral-50 text-sm"
                      >
                        {firstHighlight?.tag?.label}
                      </span>
                      <Dot className="h-4 w-4 text-neutral-50" />
                      <span
                        ref={snippetsTextRef}
                        className="text-neutral-50 text-sm opacity-66"
                      >
                        {secondHighlight?.tag?.label}
                      </span>
                    </div>
                  </div>
                </WidgetCard>

                {/* Slide Indicators */}
                <div className="absolute top-1/2 right-0 flex translate-x-4 -translate-y-1/2 flex-col gap-1">
                  <div
                    ref={indicator1Ref}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      animateToSlide(0);
                    }}
                    className="h-1 w-1 cursor-pointer rounded-full bg-neutral-950"
                  />
                  <div
                    ref={indicator2Ref}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      animateToSlide(1);
                    }}
                    className="h-1 w-1 cursor-pointer rounded-full bg-neutral-950/33"
                  />
                </div>
              </TransitionLink>
            </div>

            {/* BOTTOM ROW WRAPPER */}
            <div
              className="grid grid-cols-1 md:h-full md:grid-cols-3"
              style={{ gap: "2rem" }}
            >
              {/* BOTTOM ROW - Column 1: Digital Art */}
              <TransitionLink
                href="/digital-art"
                className="block aspect-2/1 w-full md:aspect-square"
              >
                <WidgetCard
                  label={widgets.digitalArt.label}
                  src={covers.digitalArt}
                  alt={widgets.digitalArt.alt}
                  className="h-full bg-neutral-400"
                />
              </TransitionLink>

              {/* BOTTOM ROW - Column 2: Photography */}
              <TransitionLink
                href="/photography"
                className="aspect-2/1 w-full md:aspect-square md:h-full"
              >
                <WidgetCard
                  label={widgets.photography.label}
                  src={covers.photography}
                  alt={widgets.photography.alt}
                  className="bg-neutral-500"
                />
              </TransitionLink>

              {/* BOTTOM ROW - Column 3: Experiments + Contact subgrid */}
              <div
                className="grid aspect-square grid-cols-1 md:grid-rows-2"
                style={{ gap: "2rem" }}
              >
                {/* The blog, in the experiments' old spot */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  <BlogWidget />
                </div>

                {/* Products, in contact's old spot: contact is next to the
                    island on every page now. Until there's a product to try,
                    contact keeps it */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  {products.length > 0 ? (
                    <ProductsWidget products={products} />
                  ) : (
                    // The icons are a picture, the modal has the links
                    <WidgetCard
                      label={widgets.contact.label}
                      className="h-full bg-linear-to-b from-[#B1EB10] to-[#2FC72F]"
                      onClick={() => openContact({ from: "home" })}
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none flex h-full items-center justify-center gap-6"
                      >
                        {getContactLinks(contact).map(({ id, icon: Icon }) => (
                          <Icon key={id} className="h-6 w-6 text-neutral-50" />
                        ))}
                      </div>
                    </WidgetCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWithFooter>
  );
};

export default Page;
