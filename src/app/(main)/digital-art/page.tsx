"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import SliderIndicator from "~/modules/ui-ux/components/slider-indicator";
import HorizontalImageSlider from "~/modules/digital-art/components/horizontal-image-slider";
import { digitalArtProjects } from "~/data/digital-art-projects";
import ImagePopover from "~/modules/core/components/image-popover";

const DigitalArtPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSlideChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleSlideClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return (
    <main
      ref={containerRef}
      className="h-screen overflow-hidden relative bg-neutral-50"
    >
      {/* Slider Indicator */}
      <SliderIndicator
        totalSlides={digitalArtProjects.length}
        activeIndex={activeIndex}
        onSlideClick={handleSlideClick}
        labels={digitalArtProjects.map((p) => p.title)}
        orientation="horizontal"
        pendingIndex={pendingIndex}
      />

      {/* Horizontal Image Slider */}
      <div className="h-full flex items-center justify-center">
        <HorizontalImageSlider
          items={digitalArtProjects}
          activeIndex={activeIndex}
          onActiveIndexChange={handleSlideChange}
          onOpenPopover={() => {
            setIsPopoverOpen(true);
          }}
          pendingIndex={pendingIndex}
          onPendingIndexChange={setPendingIndex}
        />
      </div>
      <ImagePopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        items={digitalArtProjects}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </main>
  );
};

export default DigitalArtPage;
