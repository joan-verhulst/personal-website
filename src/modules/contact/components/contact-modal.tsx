"use client";

import {
  ArrowUpRight,
  Instagram,
  Linkedin,
  type LucideIcon,
  Mail,
} from "lucide-react";
import { widgets } from "~/data/widgets";
import { useContent } from "~/modules/content/components/content-provider";
import type { Contact } from "~/modules/content/types";
import Modal from "~/modules/core/components/modal";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Every way to get in touch, each a row that leads out. */
const ContactModal = ({ isOpen, onClose }: Props) => {
  const { contact } = useContent();
  const haptic = useHapticSound();
  const links = getContactLinks(contact);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={widgets.contact.label}
      className="max-w-sm"
    >
      <ul className="flex flex-col gap-2">
        {links.map(({ id, service, handle, href, icon: Icon, isExternal }) => (
          <li key={id}>
            <a
              href={href}
              {...(isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              onClick={haptic.onClick}
              onMouseEnter={haptic.onMouseEnter}
              className="group flex items-center gap-3 rounded-2xl border border-neutral-950/10 p-2 pr-3 transition-colors duration-200 hover:bg-neutral-950/5 focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              {/* Colored like the widget it opens from */}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-[#B1EB10] to-[#2FC72F] text-neutral-50">
                <Icon className="size-4.5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-neutral-950 text-sm">
                  {handle}
                </span>
                <span className="text-neutral-950/50 text-xs">{service}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-neutral-950/40 transition-colors duration-200 group-hover:text-neutral-950" />
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default ContactModal;
