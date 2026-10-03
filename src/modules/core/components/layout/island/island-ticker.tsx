"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// Height of a line, in pixels
const LINE = 20;
const EASE =
  "duration-300 ease-[cubic-bezier(0.45,0,0.55,1)] motion-reduce:transition-none";

interface Props {
  // The section's name, shown while nothing is pointed at
  label: string;
  // The things on the page, in order, see IslandControls
  labels: string[];
  pointed: number | null;
}

/**
 * The island's label, for a page with a row of things to point at. The
 * section's name rolls up to make way for what's pointed at. Along the row the
 * names roll on like the counter's digits, and the label narrows or widens to
 * fit each one.
 */
const IslandTicker = ({ label, labels, pointed }: Props) => {
  const boxRef = useRef<HTMLSpanElement>(null);
  const rowsRef = useRef<HTMLSpanElement>(null);
  const columnRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pointedRef = useRef(pointed);
  const wasPointing = useRef(false);

  const place = () => {
    const box = boxRef.current;
    const rows = rowsRef.current;
    const column = columnRef.current;
    const index = pointedRef.current;
    const item =
      index === null ? labelRef.current : itemRefs.current[index];
    if (!box || !rows || !column || !item) return;

    if (index !== null) {
      // Coming in from the section's name the column is out of sight, so it
      // jumps to the right name instead of rolling past all the others
      const instant = !wasPointing.current;
      column.style.transition = instant ? "none" : "";
      column.style.transform = `translateY(${-index * LINE}px)`;
      if (instant) column.getBoundingClientRect();
    }
    rows.style.transform = `translateY(${index === null ? 0 : -LINE}px)`;
    box.style.width = `${item.offsetWidth}px`;
    wasPointing.current = index !== null;
  };

  // Layout effect, so it's in place before it's painted
  // biome-ignore lint/correctness/useExhaustiveDependencies: placed again whenever what it shows changes
  useLayoutEffect(() => {
    pointedRef.current = pointed;
    place();
  }, [pointed, label, labels]);

  // The names take up a little more or less room once the font is in
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the first time
  useEffect(() => {
    document.fonts?.ready.then(place);
  }, []);

  return (
    <span
      ref={boxRef}
      className={`relative block h-5 min-w-0 overflow-hidden transition-[width] ${EASE}`}
    >
      <span
        ref={rowsRef}
        className={`absolute top-0 left-0 block transition-transform ${EASE}`}
      >
        <span ref={labelRef} className="block h-5 w-max leading-5">
          {label}
        </span>
        {/* One line tall, so only the name pointed at shows */}
        <span aria-hidden className="block h-5 overflow-hidden">
          <span
            ref={columnRef}
            className={`block w-max leading-5 transition-transform ${EASE}`}
          >
            {labels.map((text, index) => (
              <span
                key={text}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                className="block h-5 w-max"
              >
                {text}
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
};

export default IslandTicker;
