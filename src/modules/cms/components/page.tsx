import type { ComponentProps } from "react";
import cn from "~/utils/cn";

interface PageProps extends ComponentProps<"div"> {
  /**
   * "collection" is the layout's own 960px, for grids of cards. "form" is
   * 720px, for a page of stacked sections like an edit form.
   */
  width?: "collection" | "form";
}

/**
 * Sets how wide a CMS page is. The layout already centres every page at
 * 960px, so only a form page needs this, around everything it renders. Its
 * children stack 16px apart, like the layout's own.
 *
 * A <form> inside it stacks its sections the same way with
 * className="flex flex-col gap-4".
 *
 * @example
 * <Page width="form">
 *   <Header title="About" description="Shown on the about page." />
 *   <form id={FORM_ID} className="flex flex-col gap-4">
 *     <FormSection title="Intro">...</FormSection>
 *     <FormSection title="Photo">...</FormSection>
 *   </form>
 *   <PageActions>
 *     <Button type="submit" form={FORM_ID} variant="primary">Save</Button>
 *   </PageActions>
 * </Page>
 */
const Page = ({ width = "collection", className, ...props }: PageProps) => (
  <div
    className={cn(
      "mx-auto flex w-full min-w-0 flex-col gap-4",
      width === "form" && "max-w-[720px]",
      className,
    )}
    {...props}
  />
);

export default Page;
