import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldEntry } from "@repo/tenant-config";
import { StateSelectField } from "./state-select-field";
import { TestForm } from "./test-helpers";

const entry: FieldEntry = { name: "state", label: "State" };

describe("StateSelectField", () => {
  it("lets the visitor pick a state from the catalog's suggestions", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { state: "" } }}>
        {(control) => <StateSelectField control={control} name="person.state" entry={entry} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("combobox", { name: "State" }));
    await user.click(await screen.findByRole("option", { name: "Oregon" }));

    expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent("Oregon");
  });
});
