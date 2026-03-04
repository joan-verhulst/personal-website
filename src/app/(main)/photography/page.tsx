"use client";

import { useState, useRef, useCallback } from "react";
import { photographyProjects } from "~/data/photography-projects";
import ImagePopover from "~/modules/core/components/image-popover";
import { MasonryGrid } from "~/modules/photography/components/masonry-grid";

const PhotographyPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback((flatIndex: number) => {
    setActiveIndex(flatIndex);
    setIsPopoverOpen(true);
  }, []);

  return (
    <main ref={containerRef} className="relative bg-neutral-50">
      <div className="h-full flex items-center justify-center">
        <MasonryGrid
          images={photographyProjects}
          onImageClick={handleImageClick}
        />
      </div>

      <ImagePopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        items={photographyProjects}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </main>
  );
};

export default PhotographyPage;
