// Form values as a string, for telling whether they changed. JSON writes NaN (a number input
// holding something that isn't a number) as null, the same as a cleared optional number, so it's
// written distinctly here: changing one to the other is a change.
export const serializeValues = (values: unknown) =>
  JSON.stringify(values, (_key, value) => (Number.isNaN(value) ? "NaN" : value));
