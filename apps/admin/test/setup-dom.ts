import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest doesn't enable globals, so Testing Library can't register its own afterEach cleanup --
// without this, every render() would pile up in the same document across tests.
afterEach(() => cleanup());

// jsdom omits several browser APIs that Radix primitives (Switch, RadioGroup, Tabs,
// DropdownMenu) and the shadcn sidebar's useIsMobile hook call unconditionally. These stubs
// only need to exist and not throw; none of the tests depend on their behavior.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};

// Every form imports `toast` from sonner via useAutosave; tests assert on these calls
// rather than on rendered toasts (no <Toaster /> is mounted outside the root layout).
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
