import type { FieldDef } from "./types";

/**
 * A checkbox field's checked options after checking or unchecking one of them, keeping the field's
 * prerequisiteOption rule: checking any other option checks the prerequisite too, and unchecking
 * the prerequisite unchecks everything. Without a prerequisite, only the one option changes.
 */
export const toggleOption = (
  def: Pick<FieldDef, "prerequisiteOption">,
  selected: readonly string[],
  value: string,
  checked: boolean,
): string[] => {
  const prerequisite = def.prerequisiteOption;
  if (!checked) return value === prerequisite ? [] : selected.filter((option) => option !== value);
  const added = prerequisite !== undefined && value !== prerequisite ? [prerequisite, value] : [value];
  return [...new Set([...selected, ...added])];
};
