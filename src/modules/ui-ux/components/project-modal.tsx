"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { gsap } from "gsap";
import cn from "~/utils/cn";
import type { UiUxProject } from "~/data/ui-ux-projects";
import AnimatedText, {
  type AnimatedTextHandle,
} from "~/modules/core/components/utils/AnimatedText";

interface Props {
  project: UiUxProject | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectModal = ({ project, isOpen, onClose }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Refs for animated text elements
  const headerTextRef = useRef<AnimatedTextHandle>(null);
  const titleTextRef = useRef<AnimatedTextHandle>(null);
  const dateTextRef = useRef<AnimatedTextHandle>(null);
  const descriptionTextRef = useRef<AnimatedTextHandle>(null);

  const triggerAllTextAnimations = useCallback(() => {
    headerTextRef.current?.triggerAnimation();
    setTimeout(() => titleTextRef.current?.triggerAnimation(), 100);
    setTimeout(() => dateTextRef.current?.triggerAnimation(), 150);
    setTimeout(() => descriptionTextRef.current?.triggerAnimation(), 200);
  }, []);

  const animateOpen = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    const tl = gsap.timeline({
      onComplete: triggerAllTextAnimations,
    });

    // Show overlay instantly
    tl.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2 },
    );

    // Animate modal from bottom with scale 4 to scale 1
    tl.fromTo(
      modalRef.current,
      { scale: 4, y: "200vh" },
      { scale: 1, y: 0, duration: 0.5, ease: "power2.inOut" },
    );

    // Fade in image
    if (imageRef.current) {
      tl.fromTo(
        imageRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.inOut" },
        "-=0.2",
      );
    }
  }, [triggerAllTextAnimations]);

  const animateClose = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    const tl = gsap.timeline({
      onComplete: onClose,
    });

    // Then move out the modal to bottom with scale
    tl.to(modalRef.current, {
      scale: 4,
      y: "200vh",
      duration: 0.5,
      ease: "power2.inOut",
    });

    // Hide overlay at the end
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, "-=0.3");
  }, [onClose]);

  useEffect(() => {
    if (isOpen && project) {
      animateOpen();
    }
  }, [isOpen, project, animateOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      animateClose();
    }
  };

  const handleCloseClick = () => {
    animateClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        animateClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, animateClose]);

  if (!isOpen || !project) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50  p-4 overflow-hidden"
      style={{ opacity: 0 }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-neutral-50 rounded-3xl shadow-2xl"
        style={{ transform: "translateY(100vh) scale(4)" }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between pl-6 pr-4 py-4 bg-neutral-50 border-b border-neutral-950/10 rounded-t-3xl z-10">
          <AnimatedText
            ref={headerTextRef}
            as="span"
            className="text-neutral-950 text-md font-regular"
            trigger="manual"
          >
            Project View
          </AnimatedText>
          <button
            onClick={handleCloseClick}
            className="text-neutral-950 hover:text-neutral-950/75 border border-full rounded-full border-neutral-950/15 w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title and Date */}
          <div className="flex justify-between items-center mb-2">
            <AnimatedText
              ref={titleTextRef}
              as="h2"
              className="text-neutral-950 text-lg font-regular"
              trigger="manual"
            >
              {project.title}
            </AnimatedText>
            <AnimatedText
              ref={dateTextRef}
              as="span"
              className="text-neutral-950/50 text-base"
              trigger="manual"
            >
              {project.date}
            </AnimatedText>
          </div>

          {/* Description */}
          <AnimatedText
            ref={descriptionTextRef}
            as="p"
            className="text-neutral-950/66 text-base mb-8 max-w-2xl font-light"
            trigger="manual"
          >
            {project.description}
          </AnimatedText>

          {/* Project Image */}
          <div
            ref={imageRef}
            className="relative w-full aspect-video rounded-3xl overflow-hidden border border-neutral-950/10"
            style={{ opacity: 0 }}
          >
            <Image
              src={project.image}
              alt={project.title}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
