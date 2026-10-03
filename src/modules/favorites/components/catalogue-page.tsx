import { GRAIN } from "~/modules/favorites/utils/textures";
import cn from "~/utils/cn";

// Darkens a page of a leaf while it's on its way over: nothing lying flat on
// either side, deepest when it stands upright
const TURN_SHADE = "calc(var(--turn, 0) * (1 - var(--turn, 0)) * 0.9)";

interface Props {
  // The side of the fold it lies on once it's flat
  side: "left" | "right";
  // One of the two pages of a leaf that turns, instead of a page lying under them
  isLeaf?: boolean;
  canvasRef: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * One page of the catalogue: the canvas it's printed on, with the paper grain
 * and the shade of the fold over it. Side by side the fold is at the inner
 * edge, stacked it runs between the upper and the lower page.
 */
const CataloguePage = ({ side, isLeaf = false, canvasRef }: Props) => {
  return (
    <div
      className={cn(
        "backface-hidden absolute inset-0 isolate overflow-hidden rounded-[3px] bg-[#f8f6f1]",
        // The back of a leaf faces away, so it reads once the leaf is over
        isLeaf &&
          side === "left" &&
          "transform-[rotateX(180deg)] @2xl:transform-[rotateY(180deg)]",
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 size-full"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute @2xl:h-full h-[7%] @2xl:w-[7%] w-full from-neutral-950/15 to-transparent",
          side === "left"
            ? "right-0 bottom-0 @2xl:bg-linear-to-l bg-linear-to-t"
            : "top-0 left-0 @2xl:bg-linear-to-r bg-linear-to-b",
        )}
      />
      {isLeaf && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-neutral-950"
          style={{ opacity: TURN_SHADE }}
        />
      )}
    </div>
  );
};

export default CataloguePage;
