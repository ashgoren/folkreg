import { describe, it, expect } from "vitest";
import { toggleOption } from "./options";

describe("toggleOption", () => {
  describe("without a prerequisite", () => {
    const toggle = (selected: string[], value: string, checked: boolean) =>
      toggleOption({ prerequisiteOption: undefined, selected, value, checked });

    it("checks and unchecks just the one option", () => {
      expect(toggle(["a"], "b", true)).toEqual(["a", "b"]);
      expect(toggle(["a", "b"], "a", false)).toEqual(["b"]);
    });

    it("doesn't list an option twice", () => {
      expect(toggle(["a"], "a", true)).toEqual(["a"]);
    });
  });

  // A roster can't show someone's email without their name.
  describe("with a prerequisite", () => {
    const toggle = (selected: string[], value: string, checked: boolean) =>
      toggleOption({ prerequisiteOption: "name", selected, value, checked });

    it("checks the prerequisite along with any other option", () => {
      expect(toggle([], "email", true)).toEqual(["name", "email"]);
      expect(toggle(["name", "phone"], "email", true)).toEqual(["name", "phone", "email"]);
    });

    it("checks the prerequisite on its own", () => {
      expect(toggle([], "name", true)).toEqual(["name"]);
    });

    it("unchecks everything when the prerequisite is unchecked", () => {
      expect(toggle(["name", "email", "phone"], "name", false)).toEqual([]);
    });

    it("unchecks another option on its own", () => {
      expect(toggle(["name", "email", "phone"], "email", false)).toEqual(["name", "phone"]);
    });
  });
});
