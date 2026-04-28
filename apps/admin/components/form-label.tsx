// A wrapper around FieldLabel that adds an asterisk for required fields

import { FieldLabel } from "@/components/ui/field";

type Props = React.ComponentProps<typeof FieldLabel> & { required?: boolean };

export function FormLabel({ required, children, ...props }: Props) {
  return (
    <FieldLabel {...props}>
      {children}
      {required && <span className="text-destructive" aria-hidden>*</span>}
    </FieldLabel>
  );
}
