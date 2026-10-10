"use client";

import {
  ArrowUpRight,
  Instagram,
  Linkedin,
  type LucideIcon,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { cardLabel } from "~/data/contact-cards";
import { widgets } from "~/data/widgets";
import StatusDot from "~/modules/contact/components/status-dot";
import { useContent } from "~/modules/content/components/content-provider";
import type { Contact, ContactCardKey } from "~/modules/content/types";
import Modal from "~/modules/core/components/modal";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";
import { buttonClass } from "~/utils/button";
import { track } from "~/utils/eyes";

interface ContactLink {
  id: string;
  service: string;
  handle: string;
  href: string;
  icon: LucideIcon;
  isExternal: boolean;
}

// The name at the end of a profile URL: instagram.com/name, linkedin.com/in/name
const handleOf = (url: string) => {
  try {
    const { hostname, pathname } = new URL(url);
    const name = pathname.split("/").filter(Boolean).at(-1);
    return name ? `@${name}` : hostname;
  } catch {
    return url;
  }
};

// In the order the icons sit on the widget
export const getContactLinks = ({
  instagram,
  email,
  linkedin,
}: Contact): ContactLink[] => [
  ...(instagram
    ? [
        {
          id: "instagram",
          service: "Instagram",
          handle: handleOf(instagram),
          href: instagram,
          icon: Instagram,
          isExternal: true,
        },
      ]
    : []),
  ...(email
    ? [
        {
          id: "email",
          service: "Email",
          handle: email,
          href: `mailto:${email}`,
          icon: Mail,
          isExternal: false,
        },
      ]
    : []),
  ...(linkedin
    ? [
        {
          id: "linkedin",
          service: "LinkedIn",
          handle: handleOf(linkedin),
          href: linkedin,
          icon: Linkedin,
          isExternal: true,
        },
      ]
    : []),
];

/**
 * Where a card's button leads. UI/UX links out to where projects start, the
 * others open an email with the card's title as its subject. Without a link
 * or an address there's nowhere to go, and the card stays off the site.
 */
export const cardLink = (key: ContactCardKey, contact: Contact) => {
  const card = contact.cards[key];
  if (key === "uiUx") {
    return card.href ? { href: card.href, isExternal: true } : null;
  }
  if (!contact.email) return null;
  return {
    href: `mailto:${contact.email}?subject=${encodeURIComponent(card.title)}`,
    isExternal: false,
  };
};

// The UI/UX card glows like the wall's sky blue, the closest to the buttons
const PRIMARY_BACKGROUND = wallBackgrounds.sky;

// "pixelperfect.agency" for https://www.pixelperfect.agency/contact
const siteOf = (url?: string) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const SECONDARY_CARDS = ["photography", "digitalArt"] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Every way to get in touch: UI/UX first and loudest, prints and licensing
 * after it, and the socials under them.
 */
const ContactModal = ({ isOpen, onClose }: Props) => {
  const { contact, covers, highlights, wall } = useContent();
  const haptic = useHapticSound();
  const links = getContactLinks(contact);
  const primary = contact.cards.uiUx;
  const primaryLink = cardLink("uiUx", contact);
  // A shot from the site the button leads to, the first on the wall, so the
  // card shows where it goes. Without one, the first home highlight
  const projectSite = siteOf(primary.href);
  const peek =
    wall
      .flatMap((block) => block.items)
      .find(
        (item) =>
          item.media.type === "image" &&
          projectSite !== null &&
          siteOf(item.link?.href) === projectSite,
      ) ?? highlights[0];
  const coverOf = {
    photography: covers.photography,
    digitalArt: covers.digitalArt,
  };
  const secondary = SECONDARY_CARDS.flatMap((key) => {
    const link = cardLink(key, contact);
    return link ? [{ key, link, card: contact.cards[key] }] : [];
  });

  const onCardClick = (card: ContactCardKey) => {
    haptic.onClick();
    track("Contact Card Clicked", { card, from: "modal" });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={widgets.contact.label}
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <article
          className="relative inset-border overflow-hidden rounded-3xl [--inset-border-color:rgb(250_249_249/0.15)]"
          style={{ background: PRIMARY_BACKGROUND }}
        >
          <div className="relative z-1 flex flex-col items-start p-6 sm:max-w-[56%] sm:pb-7">
            <span className="mb-4 flex h-7 items-center gap-2 rounded-full bg-neutral-50/15 px-3 text-neutral-50 text-sm">
              <StatusDot />
              {cardLabel("uiUx")}
            </span>
            <h3 className="text-balance text-neutral-50 text-xl leading-tight">
              {primary.title}
            </h3>
            <p className="mt-1 font-light text-base text-neutral-50/75 leading-snug">
              {primary.text}
            </p>
            {primaryLink && (
              <a
                href={primaryLink.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onCardClick("uiUx")}
                onMouseEnter={haptic.onMouseEnter}
                className={buttonClass("light", "mt-5")}
              >
                {primary.button}
                <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>

          {/* The work peeks in from the corner, like on the wall */}
          {peek && (
            <div className="absolute right-0 bottom-0 hidden h-[78%] w-[40%] overflow-hidden rounded-tl-2xl border-neutral-50/20 border-t-6 border-l-6 bg-neutral-50 bg-clip-padding sm:block">
              <Image
                src={peek.media.src}
                alt=""
                fill
                sizes="280px"
                className="object-cover object-top-left"
              />
            </div>
          )}
        </article>

        {secondary.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {secondary.map(({ key, link, card }) => {
              const cover = coverOf[key];
              return (
                <article
                  key={key}
                  className="flex flex-col overflow-hidden rounded-3xl border border-neutral-950/10 bg-white"
                >
                  {cover && (
                    <div className="relative inset-border m-2 mb-0 aspect-2/1 overflow-hidden rounded-2xl">
                      <Image
                        src={cover}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 320px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col items-start p-5">
                    <span className="mb-3 flex h-7 items-center rounded-full bg-neutral-950/5 px-3 text-neutral-950/60 text-sm">
                      {cardLabel(key)}
                    </span>
                    <h3 className="text-lg text-neutral-950 leading-tight">
                      {card.title}
                    </h3>
                    <p className="mt-1 font-light text-base text-neutral-950/66 leading-snug">
                      {card.text}
                    </p>
                    {/* At the bottom, so both cards' buttons line up */}
                    <div className="mt-auto pt-4">
                      <a
                        href={link.href}
                        onClick={() => onCardClick(key)}
                        onMouseEnter={haptic.onMouseEnter}
                        className={buttonClass("quiet")}
                      >
                        <Mail className="size-4" />
                        {card.button}
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <span className="text-neutral-950/50 text-xs">Elsewhere</span>
            <ul className="flex flex-col gap-2">
              {links.map(
                ({ id, service, handle, href, icon: Icon, isExternal }) => (
                  <li key={id}>
                    <a
                      href={href}
                      {...(isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      onClick={() => {
                        haptic.onClick();
                        track("Contact Clicked", { service });
                      }}
                      onMouseEnter={haptic.onMouseEnter}
                      className="group flex items-center gap-3 rounded-2xl border border-neutral-950/10 p-2 pr-3 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
                    >
                      {/* Colored like the widget it used to open from */}
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-[#B1EB10] to-[#2FC72F] text-neutral-50">
                        <Icon className="size-4.5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-neutral-950 text-sm">
                          {handle}
                        </span>
                        <span className="text-neutral-950/50 text-xs">
                          {service}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-neutral-950/40 transition-colors duration-200 group-hover:text-neutral-950" />
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ContactModal;
