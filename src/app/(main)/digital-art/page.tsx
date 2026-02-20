"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import SliderIndicator from "~/modules/ui-ux/components/slider-indicator";
import HorizontalImageSlider from "~/modules/digital-art/components/horizontal-image-slider";
import { digitalArtProjects } from "~/data/digital-art-projects";

const DigitalArtPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const handleSlideChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleSlideClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return (
    <main ref={containerRef} className="h-screen overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 bg-neutral-50 -z-20" />

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
          pendingIndex={pendingIndex}
          onPendingIndexChange={setPendingIndex}
        />
      </div>
    </main>
  );
};

export default DigitalArtPage;
