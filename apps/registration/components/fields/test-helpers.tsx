import { useForm, type Control, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";

// A minimal host form for testing one field component in isolation, with real react-hook-form
// validation wiring (mode: "onBlur", matching the real form) rather than a mocked control object.
// children sees Control<FieldValues> (the same loosened type every field component takes, since a
// tenant's active fields aren't known until runtime) rather than Control<T> -- RHF's Control type
// isn't covariant in its generic, so a specific Control<T> isn't otherwise assignable to it.
export function TestForm<T extends FieldValues>({ defaultValues, resolver, children }: {
  defaultValues: T;
  resolver?: Resolver<T>;
  children: (control: Control<FieldValues>) => React.ReactNode;
}) {
  const { control } = useForm<T>({ defaultValues: defaultValues as DefaultValues<T>, resolver, mode: "onBlur" });
  return <>{children(control as unknown as Control<FieldValues>)}</>;
}
