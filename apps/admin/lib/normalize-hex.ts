// Tidies typed/pasted hex color into #rrggbb form (trims, adds "#", expands shorthand)
export const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  const withHash = /^([0-9a-f]{3}){1,2}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
  const shorthand = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(withHash);
  if (!shorthand) return withHash;
  const [, r, g, b] = shorthand;
  return `#${r}${r}${g}${g}${b}${b}`;
};
