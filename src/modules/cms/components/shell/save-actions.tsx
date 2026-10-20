"use client";

import type { ReactNode } from "react";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import PageActions from "~/modules/cms/components/shell/page-actions";

interface SaveActionsProps {
  isDirty: boolean;
  isPending?: boolean;
  isDisabled?: boolean;
  isAlwaysEnabled?: boolean;
  label?: string;
  formId?: string;
  onSave?: () => void;
  start?: ReactNode;
}

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
