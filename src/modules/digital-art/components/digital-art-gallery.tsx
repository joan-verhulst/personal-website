"use client";

import { useState, useCallback, useMemo } from "react";
import PageWithFooter from "~components/layout/footer";
import IslandControls from "~components/layout/island/island-controls";
import ImagePopover from "~/modules/core/components/image-popover";
import ArtScrubber from "~/modules/digital-art/components/art-scrubber";
import HorizontalImageSlider from "~/modules/digital-art/components/horizontal-image-slider";
import type { Artwork } from "~/modules/digital-art/utils/slide-image";
import { track } from "~/utils/eyes";

interface Props {
  artworks: Artwork[];
}

const DigitalArtGallery = ({ artworks }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [pointedIndex, setPointedIndex] = useState<number | null>(null);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSlideChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);
  const openPopover = useCallback(
    (index: number) => {
      setIsPopoverOpen(true);
      track("Artwork Opened", { artwork: artworks[index].title });
    },
    [artworks],
  );

  const shownIndex = pointedIndex ?? pendingIndex ?? activeIndex;
  const titles = useMemo(() => artworks.map(({ title }) => title), [artworks]);

  return (
    <PageWithFooter className="h-screen overflow-hidden">
      <h1 className="sr-only">Digital Art</h1>
      <IslandControls
        labels={titles}
        pointed={pointedIndex}
        count={shownIndex + 1}
      >
        <ArtScrubber
          pieces={artworks}
          activeIndex={activeIndex}
          pendingIndex={pendingIndex}
          pointedIndex={pointedIndex}
          onPoint={setPointedIndex}
          onSelect={setActiveIndex}
        />
      </IslandControls>

      <div className="flex h-full items-center justify-center">
        <HorizontalImageSlider
          items={artworks}
          activeIndex={activeIndex}
          onActiveIndexChange={handleSlideChange}
          onOpenPopover={openPopover}
          pendingIndex={pendingIndex}
          onPendingIndexChange={setPendingIndex}
        />
      </div>
      <ImagePopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        items={artworks}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </PageWithFooter>
  );
};

export default DigitalArtGallery;
