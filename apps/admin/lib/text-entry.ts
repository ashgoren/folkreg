// Whether a change is mid-typing, which decides when an autosave page saves it: a change made
// while a text field has focus waits until the field loses focus (the moment it's validated, so
// what's saved is exactly what's on screen), and any other change -- a switch, radio, checkbox,
// drag, or add/remove -- is already a complete gesture and saves right away.

const NON_TEXT_INPUT_TYPES = new Set(["checkbox", "radio", "color", "range", "file", "button", "submit", "reset", "hidden"]);

export const isTextEntry = (element: Element | null) =>
  element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(element.type));
