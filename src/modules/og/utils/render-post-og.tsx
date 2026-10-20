import { ImageResponse } from "next/og";
import { blogHero, formatPostDate, type Post, postSections } from "~/data/posts";
import { siteData } from "~/data/site";
import { skyGradient } from "~/modules/core/utils/sky-gradient";
import { OG_SIZE } from "~/modules/og/components/home-screen-card";
import { legacyColors, loadFont, loadPublicImage } from "~/modules/og/utils/og-assets";

const INK = "#0f0f0f";
const PAPER = "#faf9f9";
const MUTED = "rgba(15, 15, 15, 0.5)";
const PADDING = 64;
const COVER_WIDTH = 470;

// A post drawn live (the sky) gets the site's midday sky as its cover.
const SKY = legacyColors(
  skyGradient(30, 0.5, 100).match(/linear-gradient\(.*\)$/)?.[0] ?? "#bcd8f2",
);

/** The share image for one post: its cover beside its title. */
export const renderPostOg = async (post: Post) => {
  const kicker = `${blogHero.title} · ${postSections[post.section].title}`;
  const meta = `${formatPostDate(post.date)} · ${post.minutes} min read`;
  const [avatar, cover, font] = await Promise.all([
    loadPublicImage("icons/icon-192.png"),
    post.cover ? loadPublicImage(post.cover.replace(/^\//, "")) : undefined,
    loadFont([kicker, post.title, meta, siteData.owner.name].join("")),
  ]);
  const coverHeight = OG_SIZE.height - PADDING * 2;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        padding: PADDING,
        gap: 56,
        background: PAPER,
        color: INK,
        fontFamily: "Google Sans Flex",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{kicker}</div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {post.title}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>{meta}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          {avatar && (
            <img
              src={avatar}
              alt=""
              width={44}
              height={44}
              style={{ width: 44, height: 44, borderRadius: "50%" }}
            />
          )}
          {siteData.owner.name}
        </div>
      </div>
      {cover ? (
        <img
          src={cover}
          alt=""
          width={COVER_WIDTH}
          height={coverHeight}
          style={{
            width: COVER_WIDTH,
            height: coverHeight,
            borderRadius: 32,
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width: COVER_WIDTH,
            height: coverHeight,
            borderRadius: 32,
            background: SKY,
          }}
        />
      )}
    </div>,
    {
      ...OG_SIZE,
      fonts: font
        ? [{ name: "Google Sans Flex", data: font, weight: 400, style: "normal" }]
        : undefined,
    },
  );
};
