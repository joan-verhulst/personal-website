"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import SliderIndicator from "~/modules/ui-ux/components/slider-indicator";
import ProjectCard from "~/modules/ui-ux/components/project-card";
import ProjectModal from "~/modules/ui-ux/components/project-modal";
import FloatingActionBar from "~/modules/ui-ux/components/floating-action-bar";
import {
  uiUxProjects,
  uiUxSnippets,
  type UiUxProject,
} from "~/data/ui-ux-projects";

type TabType = "projects" | "snippets";

const UiUxPage = () => {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  const [selectedProject, setSelectedProject] = useState<UiUxProject | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const projectRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Get active project's primary color
  const activeProject = uiUxProjects[activeProjectIndex];
  const activePrimaryColor = activeProject?.primaryColor ?? "#3A9BD8";

  // Animate to a specific project index
  const animateToProject = useCallback(
    (targetIndex: number) => {
      if (
        isAnimating ||
        targetIndex === activeProjectIndex ||
        targetIndex < 0 ||
        targetIndex >= uiUxProjects.length
      )
        return;

      const currentRef = projectRefs.current[activeProjectIndex];
      const targetRef = projectRefs.current[targetIndex];

      if (!currentRef || !targetRef) return;

      setIsAnimating(true);

      const direction = targetIndex > activeProjectIndex ? 1 : -1; // 1 = scroll down (next), -1 = scroll up (prev)

      const tl = gsap.timeline({
        onComplete: () => {
          setActiveProjectIndex(targetIndex);
          setIsAnimating(false);
        },
      });

      // Current project animates out
      tl.to(currentRef, {
        y: direction === 1 ? "-100vh" : "100vh",
        opacity: 0,
        scale: 0.9,
        duration: 0.5,
        ease: "power2.inOut",
      });

      // Target project animates in
      tl.fromTo(
        targetRef,
        {
          y: direction === 1 ? "100vh" : "-100vh",
          opacity: 0,
          scale: 0.9,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.3",
      );
    },
    [activeProjectIndex, isAnimating],
  );

  // Handle wheel events for project navigation
  useEffect(() => {
    if (activeTab !== "projects" || isModalOpen) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;
    const threshold = 50; // Minimum delta to trigger navigation

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isAnimating) return;

      accumulatedDelta += e.deltaY;

      if (wheelTimeout) clearTimeout(wheelTimeout);

      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) >= threshold) {
          if (accumulatedDelta > 0) {
            // Scroll down - next project
            animateToProject(activeProjectIndex + 1);
          } else {
            // Scroll up - previous project
            animateToProject(activeProjectIndex - 1);
          }
        }
        accumulatedDelta = 0;
      }, 50);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [
    activeTab,
    activeProjectIndex,
    isAnimating,
    isModalOpen,
    animateToProject,
  ]);

  // Handle slider indicator click
  const handleSlideClick = useCallback(
    (index: number) => {
      animateToProject(index);
    },
    [animateToProject],
  );

  // Handle project card click
  const handleProjectClick = (project: UiUxProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <main ref={containerRef} className="h-screen overflow-hidden relative">
      {/* Background with primary color tint */}
      <div className="fixed inset-0 bg-neutral-50 -z-20" />
      <div
        className="fixed inset-0 -z-10 transition-colors duration-500"
        style={{ backgroundColor: activePrimaryColor, opacity: 0.05 }}
      />

      {/* Slider Indicator */}
      {activeTab === "projects" && (
        <SliderIndicator
          totalSlides={uiUxProjects.length}
          activeIndex={activeProjectIndex}
          onSlideClick={handleSlideClick}
          labels={uiUxProjects.map((p) => p.title)}
        />
      )}

      {/* Main Content */}
      {activeTab === "projects" ? (
        <div className="h-full flex items-center justify-center">
          {uiUxProjects.map((project, index) => (
            <div
              key={project.id}
              ref={(el) => {
                projectRefs.current[index] = el;
              }}
              className="absolute"
              style={{
                opacity: index === activeProjectIndex ? 1 : 0,
                pointerEvents: index === activeProjectIndex ? "auto" : "none",
              }}
            >
              <ProjectCard
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="h-full overflow-auto pt-32 pb-24 px-8 md:px-16 lg:px-32 xl:px-64">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {uiUxSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="aspect-video bg-neutral-200 rounded-2xl overflow-hidden relative"
              >
                <span className="absolute bottom-4 left-4 text-neutral-950 text-sm font-medium">
                  {snippet.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Project Modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </main>
  );
};

export default UiUxPage;
