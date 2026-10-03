"use client";

import { useCallback, useEffect, useRef } from "react";
import { discardUpload } from "~/modules/cms/actions/media";

/**
 * Looks after the file a form uploaded but hasn't saved yet, so it doesn't
 * stay in storage when it turns out not to be needed: another upload took its
 * place, it was removed again, or the form closed without saving.
 *
 * The file that's saved is never touched, and neither is one whose save is
 * still on its way. It lives in a hook rather than on the buttons, so it
 * keeps working wherever Save and Cancel end up.
 *
 * @example
 * const upload = useUnsavedUpload(site.about_image);
 *
 * // A new upload, or null when the photo is removed
 * upload.track(media.path);
 *
 * const onSubmit = handleSubmit(async (values) => {
 *   upload.submit(values.image);
 *   const result = await run(() => saveAbout(values), "About saved");
 *   upload.settle(!!result && !result.error);
 * });
 *
 * // A dialog that closes without saving
 * upload.discard();
 */
export const useUnsavedUpload = (savedPath: string | null | undefined) => {
  const saved = useRef(savedPath ?? null);
  const unsaved = useRef<string | null>(null);
  const submitted = useRef<string | null>(null);

  // A save shows up here as a new saved path once the screen has reloaded
  useEffect(() => {
    saved.current = savedPath ?? null;
    if (unsaved.current === saved.current) unsaved.current = null;
  }, [savedPath]);

  const drop = useCallback((path: string | null) => {
    if (!path || path === saved.current || path === submitted.current) return;
    // The server only removes a file no row points at, so a wrong call here
    // can't take anything that's live
    discardUpload(path).catch(() => undefined);
  }, []);

  /** The form now holds this file: a fresh upload, or null after Remove. */
  const track = useCallback(
    (path: string | null) => {
      const previous = unsaved.current;
      unsaved.current = path && path !== saved.current ? path : null;
      if (previous !== unsaved.current) drop(previous);
    },
    [drop],
  );

  /** Call right before the save, with the path that's being saved. */
  const submit = useCallback((path: string | null) => {
    submitted.current = path;
  }, []);

  /** Call when the save is back, with whether it worked. */
  const settle = useCallback((isSaved: boolean) => {
    if (isSaved) {
      saved.current = submitted.current;
      if (unsaved.current === saved.current) unsaved.current = null;
    }
    submitted.current = null;
  }, []);

  /** The form is closing without a save: lets go of the unsaved file. */
  const discard = useCallback(() => {
    const path = unsaved.current;
    unsaved.current = null;
    drop(path);
  }, [drop]);

  // Leaving the page counts as closing without a save
  useEffect(() => discard, [discard]);

  return { track, submit, settle, discard };
};
