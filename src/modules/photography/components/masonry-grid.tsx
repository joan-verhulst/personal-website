"use client";

import { useRef } from "react";
import type { PhotographyProject } from "~/data/photography-projects";
import MasonryGridItem from "./masonry-grid-item";

const NUM_COLS = 3;

function distributeIntoColumns(
  images: PhotographyProject[],
  numCols: number,
): Array<Array<PhotographyProject & { _flatIndex: number }>> {
  const cols = Array.from(
    { length: numCols },
    () => [] as Array<PhotographyProject & { _flatIndex: number }>,
  );
  images.forEach((img, i) => {
    cols[i % numCols].push({ ...img, _flatIndex: i });
  });
  return cols;
}

interface MasonryGridProps {
  images: PhotographyProject[];
  onImageClick: (flatIndex: number) => void;
}

export function MasonryGrid({ images, onImageClick }: MasonryGridProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const columns = distributeIntoColumns(images, NUM_COLS);

  return (
    <section ref={sectionRef} className="w-full mt-36 pb-128 px-8 md:px-32">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 items-start">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3 md:gap-6">
            {col.map((item) => (
              <MasonryGridItem
                key={item._flatIndex}
                item={item}
                colIndex={colIdx}
                onClick={() => onImageClick(item._flatIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
