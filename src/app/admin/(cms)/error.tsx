"use client";

import { useEffect } from "react";
import Button from "~/modules/cms/components/button";
import Header from "~/modules/cms/components/header";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Sits inside the CMS layout, so a page that failed to load keeps the sidebar
// and a way out
const CmsError = ({ error, reset }: Props) => {
  // The digest finds the full error in the server's log. It means nothing on
  // screen
  useEffect(() => {
    console.error(error.digest ?? error);
  }, [error]);

  return (
    <Header
      title="Couldn't load this page"
      description="Something went wrong while reading the content. Try again, or go back to the dashboard."
      actions={
        <>
          <Button href={ADMIN_ROOT}>Dashboard</Button>
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        </>
      }
    />
  );
};

export default CmsError;
