// A date (or date and time) Input wired to react-hook-form via Controller. Its value is "" or what
// the input gives: YYYY-MM-DD for a date, YYYY-MM-DDTHH:mm for a date and time.
//
// Either input reports a half-typed value (e.g. 09/__/2027) as "", the same as an empty one. Saved
// as is, it would quietly clear the date. So a half-typed date is held as INCOMPLETE_DATE, which no
// date schema accepts, and the field shows its error instead. The input is then given "", which
// leaves the browser's half-typed text on screen rather than wiping it.
//
// With `clearable`, a Clear button blanks it: not every browser's date input has its own way to,
// and for an optional date blank is a setting of its own (e.g. no closing time).

import { useRef } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";

const INCOMPLETE_DATE = "incomplete";

const dateValue = ({ value, validity }: HTMLInputElement) =>
  (value === "" && validity.badInput ? INCOMPLETE_DATE : value);

export function DateField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  withTime = false,
  clearable = false,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: string;
  description?: string;
  /** A date and time (datetime-local) rather than a date alone. */
  withTime?: boolean;
  /** Show a Clear button while it holds a value. */
  clearable?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormLabel htmlFor={id}>{label}</FormLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              id={id}
              type={withTime ? "datetime-local" : "date"}
              className="w-fit"
              aria-invalid={fieldState.invalid}
              value={field.value === INCOMPLETE_DATE ? "" : field.value}
              onChange={(e) => field.onChange(dateValue(e.target))}
              onBlur={(e) => {
                // Typing part of a date into an empty input leaves its value "", so React fires no
                // change for it; leaving the input is when that gets noticed.
                const value = dateValue(e.target);
                if (value !== field.value) field.onChange(value);
                field.onBlur();
              }}
            />
            {clearable && field.value !== "" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Clear ${label}`}
                onClick={() => {
                  // A half-typed value is "" to React already, so React wouldn't touch the input;
                  // the browser's own text has to be cleared directly.
                  if (inputRef.current) inputRef.current.value = "";
                  field.onChange("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
