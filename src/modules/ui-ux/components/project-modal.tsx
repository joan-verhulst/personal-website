"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { gsap } from "gsap";
import cn from "~/utils/cn";
import type { UiUxProject } from "~/data/ui-ux-projects";

interface Props {
  project: UiUxProject | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectModal = ({ project, isOpen, onClose }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const animateOpen = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    const tl = gsap.timeline();

    tl.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" },
    );

    tl.fromTo(
      modalRef.current,
      { opacity: 0, scale: 0.95, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power2.out" },
      "-=0.2",
    );
  }, []);

  const animateClose = useCallback(() => {
    if (!overlayRef.current || !modalRef.current) return;

    const tl = gsap.timeline({
      onComplete: onClose,
    });

    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.95,
      y: 20,
      duration: 0.2,
      ease: "power2.in",
    });

    tl.to(
      overlayRef.current,
      { opacity: 0, duration: 0.2, ease: "power2.in" },
      "-=0.1",
    );
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4"
      style={{ opacity: 0 }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-3xl shadow-2xl"
        style={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-8 py-6 bg-white border-b border-neutral-950/10 rounded-t-3xl z-10">
          <span className="text-neutral-950/66 text-sm font-medium">
            Project View
          </span>
          <button
            onClick={handleCloseClick}
            className="text-neutral-950/66 hover:text-neutral-950 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Title and Date */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-neutral-950 text-2xl font-medium">
              {project.title}
            </h2>
            <span className="text-neutral-950/66 text-base">
              {project.date}
            </span>
          </div>

          {/* Description */}
          <p className="text-neutral-950/66 text-base leading-relaxed mb-8 max-w-2xl">
            {project.description}
          </p>

          {/* Project Image */}
          <div
            className="relative w-full aspect-video rounded-3xl overflow-hidden border border-neutral-950/10"
            style={{ backgroundColor: project.primaryColor }}
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
