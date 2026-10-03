"use client";

import Image from "next/image";
import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widget-card";
import { Dot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { widgets } from "~/data/widgets";
import AboutModal from "~/modules/about/components/about-modal";
import ContactModal, {
  getContactLinks,
} from "~/modules/contact/components/contact-modal";
import ExperimentsModal from "~/modules/experiments/components/experiments-modal";
import FavoritesModal from "~/modules/favorites/components/favorites-modal";
import Gear from "~/modules/favorites/components/gear";
import OnRotation from "~/modules/favorites/components/on-rotation";
import Vinyl from "~/modules/favorites/components/vinyl";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { OPEN_WIDGET_EVENT } from "~/utils/open-widget";

const Page = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const projectsSlideRef = useRef<HTMLDivElement>(null);
  const snippetsSlideRef = useRef<HTMLDivElement>(null);
  const indicator1Ref = useRef<HTMLDivElement>(null);
  const indicator2Ref = useRef<HTMLDivElement>(null);
  const projectsTextRef = useRef<HTMLSpanElement>(null);
  const snippetsTextRef = useRef<HTMLSpanElement>(null);
  const slideTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const [activeSlide, setActiveSlide] = useState(0); // 0 for projects, 1 for snippets
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isExperimentsOpen, setIsExperimentsOpen] = useState(false);
  const [isOnRotationOpen, setIsOnRotationOpen] = useState(false);
  const [isGearOpen, setIsGearOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const { about, contact, covers, experiments, highlights, records } =
    useContent();
  // Two pieces from the UI/UX wall rotate in the widget
  const [firstHighlight, secondHighlight = firstHighlight] = highlights;
  // The shader fills the experiments widget, the nav reel peeks over it
  const [shaderExperiment, navExperiment] = experiments;
  // The record that's on spins on the On Rotation widget
  const [currentRecord] = records;

  // The island can open these too, from any page
  useEffect(() => {
    const open: Record<string, () => void> = {
      about: () => setIsAboutOpen(true),
      "on-rotation": () => setIsOnRotationOpen(true),
      gear: () => setIsGearOpen(true),
      contact: () => setIsContactOpen(true),
      experiments: () => setIsExperimentsOpen(true),
    };

    const handleOpen = (event: Event) => {
      const widget = (event as CustomEvent<string>).detail;
      if (!open[widget]) return;
      // Tells the island it was taken care of
      event.preventDefault();
      open[widget]();
    };

    window.addEventListener(OPEN_WIDGET_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_WIDGET_EVENT, handleOpen);
  }, []);

  // Initial grid animation - only on first site load, not when navigating back
  useEffect(() => {
    if (!gridRef.current) return;

    // Skip animation if user has already seen it this session
    const hasSeenIntro = sessionStorage.getItem("has-seen-intro") === "true";
    if (hasSeenIntro) return;

    // Respect reduced motion preference or disabled animations
    if (
      !animationsEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      sessionStorage.setItem("has-seen-intro", "true");
      return;
    }

    // Mark as seen for this session
    sessionStorage.setItem("has-seen-intro", "true");

    const ctx = gsap.context(() => {
      const cards = gridRef.current!.querySelectorAll(":scope > *");

      gsap.set(gridRef.current!, {
        scale: 16,
        gap: "8rem",
      });

      gsap.to(gridRef.current!, {
        scale: 1,
        gap: "3rem",
        duration: 0.8,
        ease: "back.out(1)",
      });

      gsap.set(cards, {
        scale: 0.85,
      });

      gsap.to(cards, {
        scale: 1,
        duration: 0.4,
        stagger: 0.2,
        ease: "back.out(1)",
        delay: 0.2,
      });
    });

    return () => ctx.revert();
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
    <main className="min-h-screen bg-neutral-50 ">
      <div className="flex z-10 justify-center items-center min-h-screen py-24 px-16 md:px-0 md:py-0 md:h-screen">
        <div className="w-full md:w-3xl">
          {/* Main grid - mobile: single column, desktop: 2 equal-height rows */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-rows-2 md:h-full"
            style={{ gap: "3rem" }}
          >
            {/* TOP ROW WRAPPER */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 md:h-full"
              style={{ gap: "2rem" }}
            >
              {/* TOP ROW - Column 1: About + On Rotation/Gear subgrid */}
              <div
                className="grid grid-cols-1 w-full aspect-square "
                style={{ gap: "2rem" }}
              >
                {/* About */}
                <div className="aspect-2/1 md:h-full">
                  <WidgetCard
                    label={widgets.about.label}
                    src={about.image}
                    alt={widgets.about.alt}
                    className="bg-neutral-400 h-full"
                    onClick={() => setIsAboutOpen(true)}
                  />
                </div>

                {/* On Rotation + Gear in a row */}
                <div
                  className="grid grid-cols-2 md:h-full"
                  style={{ gap: "2rem" }}
                >
                  {/* On Rotation */}
                  <div className="aspect-square md:aspect-auto md:h-full">
                    <WidgetCard
                      label={widgets.onRotation.label}
                      className="bg-linear-to-b from-[#EBCA10] to-[#EB7E10] h-full"
                      onClick={() => setIsOnRotationOpen(true)}
                    >
                      <div className="flex h-full items-center justify-center pointer-events-none">
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
                      className="bg-linear-to-b from-[#626D77] to-[#1E2D3C] h-full"
                      onClick={() => setIsGearOpen(true)}
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
                className="aspect-2/1 md:h-full md:col-span-2 relative block"
              >
                <WidgetCard
                  label={widgets.uiux.label}
                  className="h-full bg-neutral-50"
                >
                  {/* Slides wrapper with overflow hidden */}
                  <div className="relative w-full h-full overflow-hidden rounded-2xl">
                    {/* First highlight slide */}
                    <div
                      ref={projectsSlideRef}
                      className="absolute inset-0 rounded-4xl"
                      style={{
                        background: firstHighlight && getWallBackground(firstHighlight),
                      }}
                    >
                      <div className="absolute pt-8 px-12 inset-0">
                        <div className="relative inset-border overflow-hidden rounded-t-2xl h-full">
                          {firstHighlight && (
                            <Image
                              src={firstHighlight.media.src}
                              alt={firstHighlight.title}
                              fill
                              sizes="(min-width: 768px) 512px, 100vw"
                              className="object-cover object-top pointer-events-none"
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
                      <div className="absolute pt-8 px-12 inset-0">
                        <div className="relative inset-border overflow-hidden rounded-t-2xl h-full">
                          {secondHighlight && (
                            <Image
                              src={secondHighlight.media.src}
                              alt={secondHighlight.title}
                              fill
                              sizes="(min-width: 768px) 512px, 100vw"
                              className="object-cover object-top pointer-events-none"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-0 right-0 bottom-4 flex justify-center pointer-events-none">
                    <div className="h-6 px-2 flex items-center rounded-[0.625rem] backdrop-blur-lg bg-neutral-950/33">
                      <span
                        ref={projectsTextRef}
                        className="text-sm text-neutral-50"
                      >
                        {firstHighlight?.tag.label}
                      </span>
                      <Dot className="w-4 h-4 text-neutral-50" />
                      <span
                        ref={snippetsTextRef}
                        className="text-sm text-neutral-50 opacity-66"
                      >
                        {secondHighlight?.tag.label}
                      </span>
                    </div>
                  </div>
                </WidgetCard>

                {/* Slide Indicators */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 flex flex-col gap-1">
                  <div
                    ref={indicator1Ref}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      animateToSlide(0);
                    }}
                    className="w-1 h-1 rounded-full bg-neutral-950 cursor-pointer"
                  />
                  <div
                    ref={indicator2Ref}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      animateToSlide(1);
                    }}
                    className="w-1 h-1 rounded-full bg-neutral-950/33 cursor-pointer"
                  />
                </div>
              </TransitionLink>
            </div>

            {/* BOTTOM ROW WRAPPER */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 md:h-full"
              style={{ gap: "2rem" }}
            >
              {/* BOTTOM ROW - Column 1: Digital Art */}
              <TransitionLink
                href="/digital-art"
                className="aspect-2/1 md:aspect-square w-full block"
              >
                <WidgetCard
                  label={widgets.digitalArt.label}
                  src={covers.digitalArt}
                  alt={widgets.digitalArt.alt}
                  className="bg-neutral-400 h-full"
                />
              </TransitionLink>

              {/* BOTTOM ROW - Column 2: Photography */}
              <TransitionLink
                href="/photography"
                className="aspect-2/1 md:aspect-square w-full md:h-full"
              >
                <WidgetCard
                  label={widgets.photography.label}
                  src={covers.photography}
                  alt={widgets.photography.alt}
                  className="bg-neutral-500 "
                />
              </TransitionLink>

              {/* BOTTOM ROW - Column 3: Experiments + Contact subgrid */}
              <div
                className="grid grid-cols-1 md:grid-rows-2 aspect-square"
                style={{ gap: "2rem" }}
              >
                {/* Experiments */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  <WidgetCard
                    label={widgets.experiments.label}
                    className="bg-neutral-50 h-full"
                    onClick={() => setIsExperimentsOpen(true)}
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-4xl">
                      {shaderExperiment && (
                        <Image
                          src={shaderExperiment.media.src}
                          alt={shaderExperiment.title}
                          fill
                          sizes="(min-width: 768px) 256px, 100vw"
                          className="object-cover scale-125 pointer-events-none"
                        />
                      )}

                      {/* Tilted reel peeking up from the bottom edge */}
                      {navExperiment && (
                      <div
                        className="absolute right-[8%] bottom-0 w-[44%] translate-y-[28%] rotate-[-6deg] overflow-hidden rounded-xl border-4 border-neutral-50 bg-neutral-50 shadow-lg pointer-events-none"
                        style={{
                          aspectRatio:
                            navExperiment.media.width /
                            navExperiment.media.height,
                        }}
                      >
                        <WallMedia
                          item={navExperiment}
                          sizes="(min-width: 768px) 128px, 50vw"
                        />
                      </div>
                      )}

                      <div className="absolute left-4 bottom-4 h-6 px-2 flex items-center rounded-[0.625rem] backdrop-blur-lg bg-neutral-950/33 pointer-events-none">
                        <span className="text-sm text-neutral-50">
                          {experiments.length} pieces
                        </span>
                      </div>
                    </div>
                  </WidgetCard>
                </div>

                {/* Contact: the icons are a picture, the modal has the links */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  <WidgetCard
                    label={widgets.contact.label}
                    className="bg-linear-to-b from-[#B1EB10] to-[#2FC72F] h-full"
                    onClick={() => setIsContactOpen(true)}
                  >
                    <div
                      aria-hidden
                      className="flex items-center justify-center gap-6 h-full pointer-events-none"
                    >
                      {getContactLinks(contact).map(({ id, icon: Icon }) => (
                        <Icon key={id} className="w-6 h-6 text-neutral-50" />
                      ))}
                    </div>
                  </WidgetCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <FavoritesModal
        title={widgets.onRotation.label}
        isOpen={isOnRotationOpen}
        onClose={() => setIsOnRotationOpen(false)}
      >
        <OnRotation />
      </FavoritesModal>
      <FavoritesModal
        title={widgets.gear.label}
        isOpen={isGearOpen}
        onClose={() => setIsGearOpen(false)}
      >
        <Gear />
      </FavoritesModal>
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <ExperimentsModal
        isOpen={isExperimentsOpen}
        onClose={() => setIsExperimentsOpen(false)}
      />
    </main>
  );
};

export default Page;
