import type { CSSProperties } from "react";
import type { WallTag as WallTagData } from "~/modules/content/types";
import cn from "~/utils/cn";

interface Props {
  tag: WallTagData;
  className?: string;
  style?: CSSProperties;
}

// Tag pill with the project's logo, if it has one. The logo is used as a mask
// so it takes the pill's text color on any background.
const WallTag = ({ tag, className, style }: Props) => (
  <span
    className={cn(
      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm",
      className,
    )}
    style={style}
  >
    {tag.logo && (
      <span
        aria-hidden
        className="h-3.5 w-4 shrink-0 bg-current"
        style={{
          maskImage: `url(${tag.logo})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
    )}
    {tag.label}
  </span>
);

export default WallTag;
