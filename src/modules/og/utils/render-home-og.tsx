import { ImageResponse } from "next/og";
import { siteData } from "~/data/site";
import { widgets } from "~/data/widgets";
import { getContent } from "~/modules/content/utils/get-content";
import HomeScreenCard, {
  OG_SIZE,
  type OgTile,
} from "~/modules/og/components/home-screen-card";
import {
  loadFont,
  loadImage,
  loadPublicImage,
} from "~/modules/og/utils/og-assets";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";

const LABELS: Record<OgTile, string> = {
  about: widgets.about.label,
  "on-rotation": widgets.onRotation.label,
  gear: widgets.gear.label,
  "ui-ux": widgets.uiux.label,
  "digital-art": widgets.digitalArt.label,
  photography: widgets.photography.label,
  experiments: widgets.experiments.label,
  contact: widgets.contact.label,
};

// The wall backgrounds put a glow over a gradient. The renderer can't size a
// radial gradient, so the card keeps the gradient underneath
const flatBackground = (background: string) =>
  background.match(/linear-gradient\(.*\)$/)?.[0] ?? "#faf9f9";

/**
 * The home screen as a link preview, from what's in the CMS. With a section,
 * its tile stays lit and the others are greyed out.
 */
export const renderHomeOg = async (active?: OgTile) => {
  const { about, contact, covers, experiments, highlights, records } =
    await getContent();
  const [firstHighlight, secondHighlight = firstHighlight] = highlights;
  const [shaderExperiment, navExperiment] = experiments;
  const experimentLabel = `${experiments.length} pieces`;
  const tags = [firstHighlight?.tag.label, secondHighlight?.tag.label].filter(
    (tag): tag is string => Boolean(tag),
  );

  const [avatar, aboutImage, record, gear, highlight, digitalArt, photography, experiment, reel, font] =
    await Promise.all([
      loadPublicImage("icons/icon-192.png"),
      loadImage(about.image),
      loadImage(records[0]?.cover),
      loadPublicImage(widgets.gear.image),
      loadImage(firstHighlight?.media.src),
      loadImage(covers.digitalArt),
      loadImage(covers.photography),
      loadImage(shaderExperiment?.media.src),
      loadImage(
        navExperiment?.media.type === "image"
          ? navExperiment.media.src
          : undefined,
      ),
      loadFont(
        [siteData.owner.name, ...Object.values(LABELS), ...tags, experimentLabel].join(""),
      ),
    ]);

  return new ImageResponse(
    <HomeScreenCard
      name={siteData.owner.name}
      active={active}
      labels={LABELS}
      images={{
        avatar,
        about: aboutImage,
        record,
        gear,
        highlight,
        digitalArt,
        photography,
        experiment,
        reel:
          reel && navExperiment
            ? {
                src: reel,
                width: navExperiment.media.width,
                height: navExperiment.media.height,
              }
            : undefined,
      }}
      highlightBackground={
        firstHighlight
          ? flatBackground(wallBackgrounds[firstHighlight.background])
          : "#faf9f9"
      }
      highlightTags={tags}
      experimentCount={experiments.length}
      contact={{
        instagram: Boolean(contact.instagram),
        email: Boolean(contact.email),
        linkedin: Boolean(contact.linkedin),
      }}
    />,
    {
      ...OG_SIZE,
      fonts: font
        ? [{ name: "Google Sans Flex", data: font, weight: 400, style: "normal" }]
        : undefined,
    },
  );
};
