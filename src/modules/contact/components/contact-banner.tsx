"use client";

import { ArrowUpRight, Mail } from "lucide-react";
import { cardForPath, cardLabel } from "~/data/contact-cards";
import { cardLink } from "~/modules/contact/components/contact-modal";
import StatusDot from "~/modules/contact/components/status-dot";
import { useContent } from "~/modules/content/components/content-provider";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { buttonClass } from "~/utils/button";
import { track } from "~/utils/eyes";

/**
 * The page's own contact card at the top of its footer: work on home and
 * UI/UX, prints and licensing on Photography and Digital Art. Out of the way
 * of the page, for whoever reaches its end.
 */
const ContactBanner = ({ pathname }: { pathname: string }) => {
  const { contact } = useContent();
  const haptic = useHapticSound();
  const page = cardForPath(pathname);
  // Without an address, the work card stands in for the email ones
  const key = cardLink(page, contact) ? page : "uiUx";
  const link = cardLink(key, contact);
  if (!link) return null;

  const card = contact.cards[key];

  return (
    // In the footer's own look, tinted like its Back to top button, so it
    // reads as part of the footer and not as the modal's card
    <section
      aria-label={card.title}
      className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 rounded-4xl bg-neutral-50/14 p-6 md:items-center md:p-8"
    >
      <div className="flex min-w-0 max-w-[48ch] flex-col items-start">
        {/* A pill, like the cards in the contact modal */}
        <span className="mb-4 flex h-7 items-center gap-2 rounded-full bg-neutral-50/14 px-3 text-neutral-50 text-sm">
          {key === "uiUx" && <StatusDot />}
          {cardLabel(key)}
        </span>
        <h2 className="text-balance text-2xl leading-tight tracking-[-0.02em] md:text-3xl">
          {card.title}
        </h2>
        <p className="mt-1 text-neutral-50/75 text-sm leading-snug">
          {card.text}
        </p>
      </div>

      <a
        href={link.href}
        {...(link.isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        onClick={() => {
          haptic.onClick();
          track("Contact Card Clicked", { card: key, from: "footer" });
        }}
        onMouseEnter={haptic.onMouseEnter}
        className={buttonClass("light")}
      >
        {!link.isExternal && <Mail className="size-4" />}
        {card.button}
        {link.isExternal && <ArrowUpRight className="size-4" />}
      </a>
    </section>
  );
};

export default ContactBanner;
