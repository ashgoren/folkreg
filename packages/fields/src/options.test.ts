import { describe, it, expect } from "vitest";
import { toggleOption } from "./options";

describe("toggleOption", () => {
  describe("without a prerequisite", () => {
    const def = {};

    it("checks and unchecks just the one option", () => {
      expect(toggleOption(def, ["a"], "b", true)).toEqual(["a", "b"]);
      expect(toggleOption(def, ["a", "b"], "a", false)).toEqual(["b"]);
    });

    it("doesn't list an option twice", () => {
      expect(toggleOption(def, ["a"], "a", true)).toEqual(["a"]);
    });
  });

  // A roster can't show someone's email without their name.
  describe("with a prerequisite", () => {
    const def = { prerequisiteOption: "name" };

    it("checks the prerequisite along with any other option", () => {
      expect(toggleOption(def, [], "email", true)).toEqual(["name", "email"]);
      expect(toggleOption(def, ["name", "phone"], "email", true)).toEqual(["name", "phone", "email"]);
    });

    it("checks the prerequisite on its own", () => {
      expect(toggleOption(def, [], "name", true)).toEqual(["name"]);
    });

    it("unchecks everything when the prerequisite is unchecked", () => {
      expect(toggleOption(def, ["name", "email", "phone"], "name", false)).toEqual([]);
    });

    it("unchecks another option on its own", () => {
      expect(toggleOption(def, ["name", "email", "phone"], "email", false)).toEqual(["name", "phone"]);
    });
  });
});
