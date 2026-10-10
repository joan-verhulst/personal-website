import type { CSSProperties } from "react";
import type { WallTag as WallTagData } from "~/modules/content/types";
import cn from "~/utils/cn";

// The project's logo, used as a mask so it takes the text color around it on
// any background
export const TagLogo = ({
  logo,
  className,
}: {
  logo: string;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn("shrink-0 bg-current", className)}
    style={{
      maskImage: `url(${logo})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
    }}
  />
);

interface Props {
  tag: WallTagData;
  className?: string;
  style?: CSSProperties;
}

// Tag pill with the project's logo, if it has one
const WallTag = ({ tag, className, style }: Props) => (
  <span
    className={cn(
      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm",
      className,
    )}
    style={style}
  >
    {tag.logo && <TagLogo logo={tag.logo} className="h-3.5 w-4" />}
    {tag.label}
  </span>
);

export default WallTag;
