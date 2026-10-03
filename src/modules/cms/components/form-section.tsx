import type { ReactNode } from "react";
import Panel from "~/modules/cms/components/panel";

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** The section's fields, stacked under the title. */
  children: ReactNode;
  className?: string;
}

/**
 * One part of a form in its own container: what it's about on top, its
 * fields full width under it. It's a <Panel /> for fields. Put sections 16px
 * apart with className="flex flex-col gap-4" on the form around them.
 *
 * @example
 * <form className="flex flex-col gap-4">
 *   <FormSection title="Details" description="Shown under the image.">
 *     <Input.Root>...</Input.Root>
 *   </FormSection>
 * </form>
 */
const FormSection = ({
  title,
  description,
  children,
  className,
}: FormSectionProps) => (
  <Panel title={title} description={description} className={className}>
    {children}
  </Panel>
);

export default FormSection;
