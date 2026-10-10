"use client";

import { useEffect, useState } from "react";
import ContactModal from "~/modules/contact/components/contact-modal";
import { track } from "~/utils/eyes";
import { OPEN_CONTACT_EVENT, type OpenContactDetail } from "~/utils/open-contact";
import { OPEN_WIDGET_EVENT } from "~/utils/open-widget";

/**
 * The one contact modal, for every page. Opened by the pill next to the
 * island, see openContact, and by the contact widget from the home screen or
 * the island's tray, see openWidget.
 */
const ContactHost = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const { from } = (event as CustomEvent<OpenContactDetail>).detail;
      track("Contact Opened", { from });
      setIsOpen(true);
    };

    const handleWidget = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== "contact") return;
      // Tells the island it was taken care of, so it stays on this page
      event.preventDefault();
      track("Widget Opened", { widget: "contact" });
      track("Contact Opened", { from: "widget" });
      setIsOpen(true);
    };

    window.addEventListener(OPEN_CONTACT_EVENT, handleOpen);
    window.addEventListener(OPEN_WIDGET_EVENT, handleWidget);
    return () => {
      window.removeEventListener(OPEN_CONTACT_EVENT, handleOpen);
      window.removeEventListener(OPEN_WIDGET_EVENT, handleWidget);
    };
  }, []);

  return <ContactModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
};

export default ContactHost;
