import type { CSSProperties, ReactNode } from "react";

export type OgTile =
  | "about"
  | "on-rotation"
  | "gear"
  | "ui-ux"
  | "digital-art"
  | "photography"
  | "blog"
  | "contact";

export const OG_SIZE = { width: 1200, height: 630 };

const SCALE = 0.94;
const s = (value: number) => value * SCALE;

const COLUMN_GAP = s(32);
const ROW_GAP = s(48);
const CELL = (s(768) - COLUMN_GAP * 2) / 3;
const HALF = (CELL - COLUMN_GAP) / 2;
const RADIUS = s(32);

const INK = "#0f0f0f";
const PAPER = "#faf9f9";
const WARM = "linear-gradient(to bottom, #EBCA10, #EB7E10)";
const SLATE = "linear-gradient(to bottom, #626D77, #1E2D3C)";
const GREEN = "linear-gradient(to bottom, #B1EB10, #2FC72F)";
const CHIP = "rgba(15, 15, 15, 0.33)";
const DIM = "rgba(216, 216, 216, 0.85)";

export interface HomeScreenCardProps {
  name: string;
  active?: OgTile;
  labels: Record<OgTile, string>;
  images: {
    avatar?: string;
    about?: string;
    record?: string;
    gear?: string;
    highlight?: string;
    digitalArt?: string;
    photography?: string;
    blog?: string;
    sky?: string;
  };
  highlightBackground: string;
  highlightTags: string[];
  postCount: number;
  contact: { instagram: boolean; email: boolean; linkedin: boolean };
}

const fill = (width: number, height: number): CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  width,
  height,
});

const Cover = ({
  src,
  width,
  height,
  position = "center",
}: {
  src?: string;
  width: number;
  height: number;
  position?: string;
}) =>
  src ? (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      style={{ ...fill(width, height), objectFit: "cover", objectPosition: position }}
    />
  ) : null;

interface TileProps {
  label: string;
  width: number;
  height: number;
  background: string;
  isDimmed: boolean;
  children?: ReactNode;
  outside?: ReactNode;
}

const Tile = ({
  label,
  width,
  height,
  background,
  isDimmed,
  children,
  outside,
}: TileProps) => (
  <div style={{ display: "flex", position: "relative", width, height }}>
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: RADIUS,
        background,
      }}
    >
      {children}
      <div
        style={{
          ...fill(width, height),
          display: "flex",
          borderRadius: RADIUS,
          border: "1px solid rgba(15, 15, 15, 0.1)",
        }}
      />
      {isDimmed && (
        <div style={{ ...fill(width, height), display: "flex", background: DIM }} />
      )}
    </div>
    {outside}
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: height + s(8),
        left: 0,
        width,
        justifyContent: "center",
        fontSize: s(12),
        lineHeight: 1.33,
        color: isDimmed ? "rgba(15, 15, 15, 0.35)" : INK,
      }}
    >
      {label}
    </div>
  </div>
);

const Chip = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      height: s(24),
      padding: `0 ${s(8)}px`,
      borderRadius: s(10),
      background: CHIP,
      color: PAPER,
      fontSize: s(14),
    }}
  >
    {children}
  </div>
);

const Record = ({ size, cover }: { size: number; cover?: string }) => {
  const ring = (share: number) => (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: (size * (1 - share)) / 2,
        left: (size * (1 - share)) / 2,
        width: size * share,
        height: size * share,
        borderRadius: "50%",
        border: "1px solid rgba(255, 255, 255, 0.07)",
      }}
    />
  );
  const label = size * 0.36;
  const spindle = Math.max(s(6), size * 0.034);

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#141414",
        boxShadow: `0 ${s(16)}px ${s(32)}px -${s(12)}px rgba(0, 0, 0, 0.35)`,
      }}
    >
      {ring(0.73)}
      {ring(0.88)}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: (size - label) / 2,
          left: (size - label) / 2,
          width: label,
          height: label,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#2a2a2a",
        }}
      >
        <Cover src={cover} width={label} height={label} />
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: (size - spindle) / 2,
          left: (size - spindle) / 2,
          width: spindle,
          height: spindle,
          borderRadius: "50%",
          background: "#c4c4c4",
        }}
      />
    </div>
  );
};

const iconProps = {
  width: s(24),
  height: s(24),
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: PAPER,
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const InstagramIcon = () => (
  <svg aria-hidden="true" {...iconProps}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const MailIcon = () => (
  <svg aria-hidden="true" {...iconProps}>
    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
    <rect x="2" y="4" width="20" height="16" rx="2" />
  </svg>
);

const LinkedinIcon = () => (
  <svg aria-hidden="true" {...iconProps}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const HomeScreenCard = ({
  name,
  active,
  labels,
  images,
  highlightBackground,
  highlightTags,
  postCount,
  contact,
}: HomeScreenCardProps) => {
  const isDimmed = (tile: OgTile) => active !== undefined && tile !== active;
  const wide = CELL * 2 + COLUMN_GAP;
  const [firstTag, secondTag] = highlightTags;
  const skyWidth = CELL * 0.44;
  const skyHeight = skyWidth * 0.75;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        paddingTop: s(22),
        background: PAPER,
        color: INK,
        fontFamily: "Google Sans Flex",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: s(8),
          width: s(152),
          height: s(36),
          padding: `0 ${s(6)}px`,
          borderRadius: s(22),
          background: INK,
          color: PAPER,
          fontSize: s(13),
        }}
      >
        {images.avatar ? (
          <img
            src={images.avatar}
            alt=""
            width={s(24)}
            height={s(24)}
            style={{ width: s(24), height: s(24), borderRadius: "50%" }}
          />
        ) : (
          <div style={{ display: "flex", width: s(24) }} />
        )}
        <div
          style={{
            display: "flex",
            width: s(6),
            height: s(6),
            borderRadius: "50%",
            background: "#3a9bd8",
          }}
        />
        {name}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ROW_GAP,
          marginTop: s(38),
        }}
      >
        <div style={{ display: "flex", gap: COLUMN_GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: COLUMN_GAP }}>
            <Tile
              label={labels.about}
              width={CELL}
              height={HALF}
              background="#a2a2a2"
              isDimmed={isDimmed("about")}
            >
              <Cover src={images.about} width={CELL} height={HALF} />
            </Tile>
            <div style={{ display: "flex", gap: COLUMN_GAP }}>
              <Tile
                label={labels["on-rotation"]}
                width={HALF}
                height={HALF}
                background={WARM}
                isDimmed={isDimmed("on-rotation")}
              >
                <div
                  style={{
                    display: "flex",
                    width: HALF,
                    height: HALF,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Record size={HALF * 0.78} cover={images.record} />
                </div>
              </Tile>
              <Tile
                label={labels.gear}
                width={HALF}
                height={HALF}
                background={SLATE}
                isDimmed={isDimmed("gear")}
              >
                {images.gear && (
                  <img
                    src={images.gear}
                    alt=""
                    width={HALF * 0.72}
                    height={HALF * 0.72}
                    style={{
                      position: "absolute",
                      top: HALF * 0.14,
                      left: HALF * 0.14,
                      width: HALF * 0.72,
                      height: HALF * 0.72,
                      objectFit: "contain",
                    }}
                  />
                )}
              </Tile>
            </div>
          </div>

          <Tile
            label={labels["ui-ux"]}
            width={wide}
            height={CELL}
            background={highlightBackground}
            isDimmed={isDimmed("ui-ux")}
            outside={
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: s(4),
                  position: "absolute",
                  top: CELL / 2 - s(6),
                  left: wide + s(12),
                  opacity: isDimmed("ui-ux") ? 0.35 : 1,
                }}
              >
                <div style={{ display: "flex", width: s(4), height: s(4), borderRadius: "50%", background: INK }} />
                <div style={{ display: "flex", width: s(4), height: s(4), borderRadius: "50%", background: "rgba(15, 15, 15, 0.33)" }} />
              </div>
            }
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: s(32),
                left: s(48),
                width: wide - s(96),
                height: CELL - s(32),
                overflow: "hidden",
                borderRadius: `${s(16)}px ${s(16)}px 0 0`,
                border: "1px solid rgba(15, 15, 15, 0.1)",
              }}
            >
              <Cover
                src={images.highlight}
                width={wide - s(96)}
                height={CELL - s(32)}
                position="top"
              />
            </div>
            {firstTag && (
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 0,
                  bottom: s(16),
                  width: wide,
                  justifyContent: "center",
                }}
              >
                <Chip>
                  {firstTag}
                  {secondTag && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          width: s(3),
                          height: s(3),
                          margin: `0 ${s(6)}px`,
                          borderRadius: "50%",
                          background: PAPER,
                        }}
                      />
                      <div style={{ display: "flex", opacity: 0.66 }}>{secondTag}</div>
                    </div>
                  )}
                </Chip>
              </div>
            )}
          </Tile>
        </div>

        <div style={{ display: "flex", gap: COLUMN_GAP }}>
          <Tile
            label={labels["digital-art"]}
            width={CELL}
            height={CELL}
            background="#a2a2a2"
            isDimmed={isDimmed("digital-art")}
          >
            <Cover src={images.digitalArt} width={CELL} height={CELL} />
          </Tile>
          <Tile
            label={labels.photography}
            width={CELL}
            height={CELL}
            background="#878787"
            isDimmed={isDimmed("photography")}
          >
            <Cover src={images.photography} width={CELL} height={CELL} />
          </Tile>
          <div style={{ display: "flex", flexDirection: "column", gap: COLUMN_GAP }}>
            <Tile
              label={labels.blog}
              width={CELL}
              height={HALF}
              background={PAPER}
              isDimmed={isDimmed("blog")}
            >
              {images.blog && (
                <img
                  src={images.blog}
                  alt=""
                  width={CELL * 1.25}
                  height={HALF * 1.25}
                  style={{
                    position: "absolute",
                    top: -HALF * 0.125,
                    left: -CELL * 0.125,
                    width: CELL * 1.25,
                    height: HALF * 1.25,
                    objectFit: "cover",
                  }}
                />
              )}
              {images.sky && (
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    right: CELL * 0.08,
                    top: HALF - skyHeight * 0.72,
                    width: skyWidth,
                    height: skyHeight,
                    borderRadius: s(12),
                    border: `${s(4)}px solid ${PAPER}`,
                    backgroundImage: images.sky,
                    transform: "rotate(-6deg)",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: s(16),
                  bottom: s(16),
                }}
              >
                <Chip>{`${postCount} ${postCount === 1 ? "post" : "posts"}`}</Chip>
              </div>
            </Tile>
            <Tile
              label={labels.contact}
              width={CELL}
              height={HALF}
              background={GREEN}
              isDimmed={isDimmed("contact")}
            >
              <div
                style={{
                  display: "flex",
                  width: CELL,
                  height: HALF,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: s(24),
                }}
              >
                {contact.instagram && <InstagramIcon />}
                {contact.email && <MailIcon />}
                {contact.linkedin && <LinkedinIcon />}
              </div>
            </Tile>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreenCard;
