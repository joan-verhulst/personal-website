"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  type ConfirmOptions,
  useConfirm,
} from "~/modules/cms/components/confirm";

/** What the admin asks before leaving a page with unsaved changes. */
export const LEAVE_UNSAVED: ConfirmOptions = {
  title: "Leave without saving?",
  description: "Your changes on this page aren't saved yet.",
  confirmLabel: "Leave without saving",
  cancelLabel: "Keep editing",
  tone: "danger",
};

// How many screens hold unsaved changes right now. Kept outside React, so
// something far from the page, like Sign out, can ask too
let unsavedCount = 0;

/** Whether any open page or dialog has unsaved changes. */
export const hasUnsavedChanges = () => unsavedCount > 0;

/**
 * Asks before unsaved changes are lost: on closing or reloading the tab, and
 * on following a link to another page of the admin, like the sidebar, the
 * breadcrumbs or the bottom bar.
 */
export const useUnsavedWarning = (isDirty: boolean) => {
  const router = useRouter();
  const confirm = useConfirm();

  useEffect(() => {
    if (!isDirty) return;
    unsavedCount += 1;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    const guard = (event: MouseEvent) => {
      // A new tab or a download keeps this page as it is. A click another
      // guard already stopped is being asked about
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;

      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname === window.location.pathname
      ) {
        return;
      }

      // next/link leaves a click alone once its default is prevented
      event.preventDefault();
      confirm(LEAVE_UNSAVED).then((isConfirmed) => {
        if (isConfirmed) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };

    window.addEventListener("beforeunload", warn);
    // In the capture phase, so it runs before the link's own click handler
    document.addEventListener("click", guard, true);
    return () => {
      unsavedCount -= 1;
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [isDirty, confirm, router]);
};
