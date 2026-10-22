"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useMemo, useRef } from "react";
import { ownPages, pages } from "~/data/pages";
import { siteData } from "~/data/site";
import {
  CursorDoodle,
  Heading,
  PenDoodle,
  ShutterDoodle,
} from "~/modules/about/components/doodles";
import FlowerBurst from "~/modules/about/components/flower-burst";
import Room from "~/modules/about/components/room";
import {
  Avatar,
  Flag,
  Hop,
  Peek,
  Tint,
} from "~/modules/about/components/word-play";
import useReveal from "~/modules/about/hooks/use-reveal";
import type { Hotspot } from "~/modules/about/room/parts";
import type { Product, WallBlock } from "~/modules/content/types";
import { Prose, Wide } from "~/modules/blog/components/prose";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import MiniSlider from "~/modules/digital-art/components/mini-slider";
import type { Artwork } from "~/modules/digital-art/utils/slide-image";
import MiniTable from "~/modules/photography/components/mini-table";
import ProductReel from "~/modules/products/components/product-reel";
import { visitApp } from "~/utils/app-layer";
import cn from "~/utils/cn";
import { openWidget } from "~/utils/open-widget";

const WIDGETS: Record<Hotspot["target"], "on-rotation" | "gear"> = {
  music: "on-rotation",
  gear: "gear",
};

const FRAMED = 8;
const framed = (images: string[]) =>
  images.map((image) => `/_next/image?url=${encodeURIComponent(image)}&w=640&q=75`);

const CASUAL = [
  "landscape",
  "space-wallpaper",
  "space-landscape",
  "destroyed-planet",
  "space-something",
  "planet-nebula",
  "bright-space",
];

const PIXEL_PERFECT = "https://pixelperfect.agency";
const PIXEL_PERFECT_NAME = "Pixel Perfect";

const PILL =
  "group/pill no-underline! inline-flex h-8 items-center gap-1.5 rounded-full border border-neutral-950/10 pr-2.5 pl-3.5 font-normal text-neutral-950 text-sm transition-colors duration-300 hover:bg-neutral-950/5";

const PILL_ARROW =
  "size-4 transition-transform duration-300 group-hover/pill:translate-x-0.5";

const HEADLINE_AT = 0.1;
const INTRO_AT = 0.2;

const ON_TABLE = "absolute top-6 left-6 bg-white hover:bg-neutral-100";
const VIEW_ALL = "size-full justify-center rounded-2xl px-0";

// Opens a page over the about page, new tabs and windows are left to the browser
const useVisit = (href: string) => {
  const router = useRouter();
  const haptic = useHapticSound();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    haptic.onClick();
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    visitApp(href, router, "about");
  };
};

const SectionLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) => {
  const haptic = useHapticSound();
  const handleClick = useVisit(href);

  return (
    <Link
      href={href}
      scroll={false}
      onClick={handleClick}
      onMouseEnter={haptic.onMouseEnter}
      className={cn(PILL, className)}
    >
      {children}
      <ArrowRight className={PILL_ARROW} />
    </Link>
  );
};

const ProductsShowcase = ({ products }: { products: Product[] }) => {
  const haptic = useHapticSound();
  const handleClick = useVisit(ownPages.products.path);

  return (
    <ProductReel
      products={products}
      sizes="(min-width: 1024px) 960px, 100vw"
      // Runs on the page and in the app, holds still while the app moves
      pausedIn={["opening", "closing"]}
      radius="rounded-[2.5rem]"
      inset="px-8 pt-20 md:px-16 md:pt-24"
      tag="bottom-6 left-6"
      // Beside the card, in the margin to its right
      dots="top-1/2 left-full ml-2 -translate-y-1/2 flex-col md:ml-4"
      frame={(stage) => (
        <Link
          href={ownPages.products.path}
          scroll={false}
          aria-label={ownPages.products.title}
          onClick={handleClick}
          onMouseEnter={haptic.onMouseEnter}
          className="no-underline! block h-84 overflow-hidden rounded-[2.5rem] border border-neutral-950/10 bg-neutral-50 md:h-105"
        >
          {stage}
        </Link>
      )}
    />
  );
};

// The agency's own site, shown when hovering its name
const agencyShot = (wall: WallBlock[]) =>
  wall
    .flatMap((block) => block.items)
    .find((item) => item.tag?.label === PIXEL_PERFECT_NAME && item.media.type === "image");

const AboutPage = () => {
  const { about, artworks, photos, highlights, products, wall } = useContent();
  const agency = agencyShot(wall);
  const stormPhoto = photos.find((photo) => photo.id === "storm-at-the-mill");
  const highlight = highlights.find((item) => item.media.type === "image");
  const artwork = artworks[0];
  const { currently } = about;
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const proseRef = useRef<HTMLDivElement>(null);
  useReveal(proseRef);
  const pictures = framed(photos.slice(0, FRAMED).map((photo) => photo.image));
  const slides = useMemo(
    () =>
      CASUAL.map((id) => artworks.find((artwork) => artwork.id === id)).filter(
        (artwork): artwork is Artwork => Boolean(artwork),
      ),
    [artworks],
  );

  return (
    <article className="overflow-x-clip pb-32">
      <header className="mx-auto w-[min(48rem,calc(100%-2.5rem))] pt-24 md:pt-49">
        <h1
          className={cn(
            "relative z-10 text-pretty text-2xl text-neutral-950 leading-[1.4] tracking-[-0.01em] md:text-3xl",
            animationsEnabled && "animate-rise-in",
          )}
          style={{ animationDelay: `${HEADLINE_AT}s` }}
        >
          I'm{" "}
          {about.modalImage ? (
            <Peek image={about.modalImage} caption={siteData.owner.name}>
              <Avatar image={about.modalImage} />
              Joan
            </Peek>
          ) : (
            "Joan"
          )}
          , a{" "}
          {highlight ? (
            <Peek image={highlight.media.src} caption={highlight.title}>
              product designer
            </Peek>
          ) : (
            "product designer"
          )}
          ,{" "}
          {artwork ? (
            <Peek image={artwork.image} caption={artwork.title}>
              digital artist
            </Peek>
          ) : (
            "digital artist"
          )}{" "}
          and{" "}
          {stormPhoto ? (
            <Peek image={stormPhoto.image} caption={stormPhoto.title}>
              photographer
            </Peek>
          ) : (
            "photographer"
          )}{" "}
          based in{" "}
          {stormPhoto ? (
            <Peek image={stormPhoto.image} caption="The Netherlands">
              <Flag />
              the Netherlands
            </Peek>
          ) : (
            "the Netherlands"
          )}
          , focused on creating thoughtful digital products and visual
          experiences.
        </h1>
        <p
          className={cn(
            "mt-5 text-pretty font-light text-lg text-neutral-950/66",
            animationsEnabled && "animate-rise-in",
          )}
          style={{ animationDelay: `${INTRO_AT}s` }}
        >
          I work with people and companies who know what they're doing, care about
          getting it right, and see design as a core part of what they build. I'm
          looking for work where I can contribute meaningfully, take ownership, and
          grow alongside people who push me to do better.
        </p>
      </header>

      <div className="inset-border mx-auto my-32 w-[min(72rem,calc(100%-2rem))] overflow-hidden rounded-4xl">
        <div className="relative aspect-4/3 md:aspect-2/1">
          <Room
            fallback={about.image}
            pictures={pictures}
            onPick={(target) => openWidget(WIDGETS[target], "room")}
          />
        </div>
      </div>

      <p className="mx-auto mb-32 w-[min(48rem,calc(100%-2.5rem))] text-pretty font-light text-lg text-neutral-950/66">
        I enjoy taking ideas from nothing to something tangible. Seeing
        something you've helped create come to life and being used by real people
        is one of the most rewarding parts of what I do. I also value the freedom
        to experiment, express myself, and keep improving.
      </p>

      <Prose
        ref={proseRef}
        className="grid-cols-[1fr_min(48rem,calc(100%-2.5rem))_1fr] [&>:first-child]:mt-0 [&>:is(h2,[data-stay])+p]:mt-2 [&>h2]:mt-32"
      >
        <Heading doodle={PenDoodle}>Graphic design</Heading>
        <p>
          My introduction to design was through graphic design and Photoshop. I
          started making wallpapers, eventually creating work that was downloaded{" "}
          millions of times. It was my first experience with making something for
          an audience I couldn't see, and learning that something I created could
          find its way onto thousands of people's screens.
        </p>
        <p>
          It also gave me a foundation in composition, <Tint>color</Tint>, <Hop>typography</Hop> and
          visual detail that I still carry into my work today.
        </p>
        {slides.length > 0 && (
          <Wide className="relative mt-16 font-normal leading-normal">
            <FlowerBurst side="left" seed={58}>
              <MiniSlider
                items={slides}
                end={
                  <SectionLink href={pages.digitalArt.path} className={VIEW_ALL}>
                    View all
                  </SectionLink>
                }
              />
            </FlowerBurst>
            <div className="absolute top-6 left-6">
              <SectionLink href={pages.digitalArt.path}>Explore graphic design</SectionLink>
            </div>
          </Wide>
        )}

        <Heading doodle={ShutterDoodle}>Photography</Heading>
        <p>
          Photography started as a hobby. I initially shot digitally, but
          eventually found myself looking for something different. Switching to
          film was a way to approach photography with fresh eyes, slow down and
          experiment with a different process.
        </p>
        <p>
          I'm still figuring out what I want my photography to say. For now, I see
          it as a way to explore different ways of looking at the world, without
          needing every image to fit into a particular style or body of work. It's
          a space to experiment, pay attention and follow my curiosity.
        </p>
        {photos.length > 0 ? (
          <Wide className="relative mt-16 font-normal leading-normal">
            <FlowerBurst>
              <MiniTable prints={photos} />
            </FlowerBurst>
            <SectionLink href={pages.photography.path} className={ON_TABLE}>
              Explore photography
            </SectionLink>
          </Wide>
        ) : (
          <div className="mt-10 flex flex-wrap gap-2">
            <SectionLink href={pages.photography.path}>Explore photography</SectionLink>
          </div>
        )}

        <Heading doodle={CursorDoodle}>Product design</Heading>
        <p>
          Web design started as something I practised alongside everything else. I
          began by designing websites for friends' school projects, mostly to learn
          by doing and see what I could make.
        </p>
        <p>
          In 2023, a few of us started{" "}
          {agency ? (
            <Peek image={agency.media.src} caption={PIXEL_PERFECT_NAME} wide>
              <a
                href={PIXEL_PERFECT}
                target="_blank"
                rel="noopener noreferrer"
                onClick={haptic.onClick}
                onMouseEnter={haptic.onMouseEnter}
              >
                {PIXEL_PERFECT_NAME}
              </a>
            </Peek>
          ) : (
            <a href={PIXEL_PERFECT} target="_blank" rel="noopener noreferrer">
              {PIXEL_PERFECT_NAME}
            </a>
          )}
          . Working on real projects
          changed the way I approached design. It was no longer just about making
          something look right; it was about understanding the people using it,
          working within real constraints and making decisions that hold up beyond
          the design itself.
        </p>
        <p>
          Working closely with developers also gave me a technical foundation that
          continues to shape how I work. With AI-assisted development, I can now
          take many of my designs directly into code, building and iterating on
          frontend implementations myself. I spend less time working exclusively in
          Figma and more time refining the actual product, shortening the distance
          between an idea and something people can use.
        </p>
        <p>
          Since starting Pixel Perfect, I've designed websites and digital products
          used by thousands of people every day, as well as helped design and build
          our own products. It's where my interests in visual design, technology and
          problem-solving come together.
        </p>
        {products.length > 0 ? (
          <Wide className="relative mt-16 font-normal leading-normal">
            <ProductsShowcase products={products} />
            <SectionLink href={pages.uiUx.path} className={ON_TABLE}>
              Explore my work
            </SectionLink>
          </Wide>
        ) : (
          <div className="mt-10 flex flex-wrap gap-2">
            <SectionLink href={pages.uiUx.path}>Explore my work</SectionLink>
          </div>
        )}

        {currently && (
          <>
            <h2>Currently</h2>
            <a
              href={currently.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={haptic.onClick}
              onMouseEnter={haptic.onMouseEnter}
              className="group no-underline! mt-5 block rounded-3xl border border-neutral-950/10 p-5 transition-colors duration-200 hover:border-neutral-950/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-base text-neutral-950">{currently.name}</span>
                    {currently.since && (
                      <span className="text-neutral-950/50 text-sm">{currently.since}</span>
                    )}
                  </div>
                  {currently.blurb && (
                    <p className="text-neutral-950/66 text-sm leading-relaxed">
                      {currently.blurb}
                    </p>
                  )}
                </div>
                {currently.url && (
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-neutral-950/50 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-950" />
                )}
              </div>
            </a>
          </>
        )}
      </Prose>
    </article>
  );
};

export default AboutPage;
