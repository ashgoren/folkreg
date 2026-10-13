/**
 * A checkbox field's checked options after checking or unchecking one of them, keeping the field's
 * prerequisiteOption rule: checking any other option checks the prerequisite too, and unchecking
 * the prerequisite unchecks everything. Without a prerequisite, only the one option changes.
 */
export const toggleOption = ({ prerequisiteOption, selected, value, checked }: {
  prerequisiteOption: string | undefined; // An option that must be checked for any other to be checked.
  selected: readonly string[]; // The options currently checked in the field.
  value: string; // The option being checked or unchecked.
  checked: boolean; // Whether the option is being checked or unchecked.
}): string[] => {
  if (!checked) return value === prerequisiteOption ? [] : selected.filter((option) => option !== value);
  const added = prerequisiteOption !== undefined && value !== prerequisiteOption ? [prerequisiteOption, value] : [value];
  return [...new Set([...selected, ...added])];
};
