"use client";

import Image from "next/image";
import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widgets/widget-card";
import { Instagram, Linkedin, Mail, Dot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { siteData } from "~/data/site";
import { widgets } from "~/data/widgets";
import { uiUxProjects, uiUxSnippets } from "~/data/ui-ux-projects";

const Page = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const projectsSlideRef = useRef<HTMLDivElement>(null);
  const snippetsSlideRef = useRef<HTMLDivElement>(null);
  const indicator1Ref = useRef<HTMLDivElement>(null);
  const indicator2Ref = useRef<HTMLDivElement>(null);
  const projectsTextRef = useRef<HTMLSpanElement>(null);
  const snippetsTextRef = useRef<HTMLSpanElement>(null);
  const [activeSlide, setActiveSlide] = useState(0); // 0 for projects, 1 for snippets
  const projectCount = uiUxProjects.length;
  const snippetCount = uiUxSnippets.length;

  // Get first project and snippet for display
  const firstProject = uiUxProjects[0];
  const firstSnippet = uiUxSnippets[0];

  // Initial grid animation - only on first site load, not when navigating back
  useEffect(() => {
    if (!gridRef.current) return;

    // Skip animation if user has already seen it this session
    const hasSeenIntro = sessionStorage.getItem("has-seen-intro") === "true";
    if (hasSeenIntro) return;

    // Mark as seen for this session
    sessionStorage.setItem("has-seen-intro", "true");

    const cards = gridRef.current.querySelectorAll(":scope > *");

    gsap.set(gridRef.current, {
      scale: 16,
      gap: "8rem",
    });

    gsap.to(gridRef.current, {
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
  }, []);

  // Function to animate to a specific slide
  const animateToSlide = (targetSlide: number) => {
    if (targetSlide === activeSlide) return;

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

    return () => clearInterval(interval);
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
              {/* TOP ROW - Column 1: About + Toolkit/Thoughts subgrid */}
              <div
                className="grid grid-cols-1 w-full aspect-square "
                style={{ gap: "2rem" }}
              >
                {/* About */}
                <div className="aspect-2/1 md:h-full">
                  <WidgetCard
                    label={widgets.about.label}
                    src={widgets.about.image}
                    alt={widgets.about.alt}
                    className="bg-neutral-400 h-full"
                  />
                </div>

                {/* Toolkit + Thoughts in a row */}
                <div
                  className="grid grid-cols-2 md:h-full"
                  style={{ gap: "2rem" }}
                >
                  {/* Toolkit */}
                  <div className="aspect-square md:aspect-auto md:h-full">
                    <WidgetCard
                      label={widgets.toolkit.label}
                      src={widgets.toolkit.image}
                      alt={widgets.toolkit.alt}
                      className="bg-linear-to-b from-[#626D77] to-[#1E2D3C] h-full"
                      imgClassName="object-contain"
                    />
                  </div>

                  {/* Thoughts */}
                  <div className="aspect-square md:aspect-auto md:h-full">
                    <WidgetCard
                      label={widgets.thoughts.label}
                      className="bg-linear-to-b from-[#EBCA10] to-[#EB7E10] h-full"
                    />
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
                    {/* Projects Slide */}
                    <div
                      ref={projectsSlideRef}
                      className="absolute inset-0 rounded-4xl"
                      style={{
                        backgroundColor:
                          firstProject?.primaryColor ?? "#3A9BD8",
                      }}
                    >
                      <div className="absolute pt-8 px-12 inset-0">
                        <div className="relative border border-neutral-950/10 overflow-hidden rounded-t-2xl h-full">
                          <Image
                            src={
                              firstProject?.image ??
                              "/assets/images/design_thumbnail.png"
                            }
                            alt={firstProject?.title ?? "UI/UX project"}
                            fill
                            className="object-cover pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Snippets Slide */}
                    <div
                      ref={snippetsSlideRef}
                      className="absolute inset-0 -translate-y-full rounded-4xl"
                      style={{
                        backgroundColor:
                          firstSnippet?.primaryColor ?? "#8B5CF6",
                      }}
                    >
                      <div className="absolute pt-8 px-12 inset-0">
                        <div className="relative border border-neutral-950/10 overflow-hidden rounded-t-2xl h-full">
                          <Image
                            src={
                              firstSnippet?.image ??
                              "/assets/images/design_thumbnail.png"
                            }
                            alt={firstSnippet?.title ?? "UI/UX snippet"}
                            fill
                            className="object-cover pointer-events-none"
                          />
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
                        {projectCount} projects
                      </span>
                      <Dot className="w-4 h-4 text-neutral-50" />
                      <span
                        ref={snippetsTextRef}
                        className="text-sm text-neutral-50 opacity-66"
                      >
                        {snippetCount} snippets
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
              <div className="aspect-2/1 md:aspect-square w-full md:h-full">
                <WidgetCard
                  label={widgets.digitalArt.label}
                  src={widgets.digitalArt.image}
                  alt={widgets.digitalArt.alt}
                  className="bg-neutral-400"
                />
              </div>

              {/* BOTTOM ROW - Column 2: Photography */}
              <div className="aspect-2/1 md:aspect-square w-full md:h-full">
                <WidgetCard
                  label={widgets.photography.label}
                  src={widgets.photography.image}
                  alt={widgets.photography.alt}
                  className="bg-neutral-500 "
                />
              </div>

              {/* BOTTOM ROW - Column 3: Experiments + Contact subgrid */}
              <div
                className="grid grid-cols-1 md:grid-rows-2 aspect-square"
                style={{ gap: "2rem" }}
              >
                {/* Experiments */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  <WidgetCard
                    label={widgets.experiments.label}
                    className="bg-neutral-600 h-full"
                  />
                </div>

                {/* Contact */}
                <div className="aspect-2/1 md:aspect-auto md:h-full">
                  <WidgetCard
                    label={widgets.contact.label}
                    className="bg-linear-to-b from-[#B1EB10] to-[#2FC72F] h-full"
                  >
                    <div className="flex items-center justify-center gap-6 h-full">
                      <a
                        href={siteData.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-6 h-6 text-neutral-50" />
                      </a>
                      <a href={siteData.social.email}>
                        <Mail className="w-6 h-6 text-neutral-50" />
                      </a>
                      <a
                        href={siteData.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin className="w-6 h-6 text-neutral-50" />
                      </a>
                    </div>
                  </WidgetCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
