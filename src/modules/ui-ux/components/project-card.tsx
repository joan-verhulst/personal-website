"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import cn from "~/utils/cn";
import type { UiUxProject } from "~/data/ui-ux-projects";

interface Props {
  project: UiUxProject;
  onClick?: () => void;
  className?: string;
}

const ProjectCard = ({ project, onClick, className }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;

    gsap.to(cardRef.current, {
      scale: 0.95,
      duration: 0.3,
      ease: "back.out(1.7)",
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;

    gsap.to(cardRef.current, {
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.7)",
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("w-3xl cursor-pointer will-change-transform", className)}
    >
      {/* Title and Date header */}
      <div className="flex justify-between items-center mb-4 ">
        <h2 className="text-neutral-950 text-lg font-regular">
          {project.title}
        </h2>
        <span className="text-neutral-950/33 text-lg">{project.date}</span>
      </div>

      {/* Project Image */}
      <div
        className="relative w-full aspect-video rounded-3xl overflow-hidden border border-neutral-950/10"
        style={{ backgroundColor: project.primaryColor }}
      >
        <div className="absolute pt-16 px-12 inset-0">
          <div className="relative border border-neutral-950/10 overflow-hidden rounded-t-2xl h-full">
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

export default ProjectCard;
