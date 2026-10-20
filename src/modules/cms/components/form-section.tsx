import type { ReactNode } from "react";
import Panel from "~/modules/cms/components/panel";

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

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
