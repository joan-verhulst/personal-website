"use client";

import type { ReactNode } from "react";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import PageActions from "~/modules/cms/components/shell/page-actions";

interface SaveActionsProps {
  /** Whether the page holds changes that aren't saved yet. */
  isDirty: boolean;
  /** Spins Save while the save runs. */
  isPending?: boolean;
  /** Turns Save off for another reason, like a file that's still going up. */
  isDisabled?: boolean;
  /**
   * Keeps Save on while nothing has changed. For a new page, where pressing
   * it shows what's still missing.
   */
  isAlwaysEnabled?: boolean;
  label?: string;
  /** The form Save submits. The bar sits outside it. */
  formId?: string;
  /** For a page without a form. */
  onSave?: () => void;
  /** Before the rest, for Delete or Discard. */
  start?: ReactNode;
}

/**
 * What every page that saves puts in the bottom bar, in this order: Delete
 * when there is one, "Unsaved changes" while there are, then Save.
 *
 * @example
 * <SaveActions
 *   formId={FORM_ID}
 *   isDirty={isDirty}
 *   isPending={isPending}
 *   start={<Button variant="danger" onClick={handleDelete}>Delete</Button>}
 * />
 */
const SaveActions = ({
  isDirty,
  isPending,
  isDisabled,
  isAlwaysEnabled,
  label = "Save",
  formId,
  onSave,
  start,
}: SaveActionsProps) => (
  <PageActions>
    {start}
    {isDirty && (
      <Badge tone="warning" role="status">
        Unsaved changes
      </Badge>
    )}
    <Button
      type={formId ? "submit" : "button"}
      form={formId}
      variant="primary"
      isPending={isPending}
      disabled={isDisabled || (!isDirty && !isAlwaysEnabled)}
      onClick={onSave}
    >
      {label}
    </Button>
  </PageActions>
);

export default SaveActions;
