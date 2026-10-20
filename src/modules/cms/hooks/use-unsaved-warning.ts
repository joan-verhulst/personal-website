"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  type ConfirmOptions,
  useConfirm,
} from "~/modules/cms/components/confirm";

export const LEAVE_UNSAVED: ConfirmOptions = {
  title: "Leave without saving?",
  description: "Your changes on this page aren't saved yet.",
  confirmLabel: "Leave without saving",
  cancelLabel: "Keep editing",
  tone: "danger",
};

let unsavedCount = 0;

export const hasUnsavedChanges = () => unsavedCount > 0;

export const useUnsavedWarning = (isDirty: boolean) => {
  const router = useRouter();
  const confirm = useConfirm();

  useEffect(() => {
    if (!isDirty) return;
    unsavedCount += 1;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    const guard = (event: MouseEvent) => {
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

      event.preventDefault();
      confirm(LEAVE_UNSAVED).then((isConfirmed) => {
        if (isConfirmed) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };

    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      unsavedCount -= 1;
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [isDirty, confirm, router]);
};
