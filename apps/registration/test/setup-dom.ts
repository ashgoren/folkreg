import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest doesn't enable globals, so Testing Library can't register its own afterEach cleanup --
// without this, every render() would pile up in the same document across tests.
afterEach(() => cleanup());
