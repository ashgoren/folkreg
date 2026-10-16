import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonCard } from "./person-card";
import { TestForm } from "./fields/test-helpers";
import { fieldConfig } from "./fields/types";

const fields = {
  contact: [fieldConfig({ name: "first", label: "First name", width: 12 })],
  misc: [fieldConfig({ name: "agreement", label: "Agreement", width: 12, options: [{ label: "Yes", value: "yes" }] })],
};

const noop = () => {};

describe("PersonCard", () => {
  it("renders its fields only while editing", () => {
    const { rerender } = render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
          />
        )}
      </TestForm>
    );
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();

    rerender(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="editing"
            onEdit={noop}
            onDone={noop}
          />
        )}
      </TestForm>
    );
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });

  it("shows a read-only summary placeholder while not editing", () => {
    render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
          />
        )}
      </TestForm>
    );
    expect(screen.getByText(/summary/i)).toBeInTheDocument();
  });

  it("calls onEdit when the Edit button is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={onEdit}
            onDone={noop}
          />
        )}
      </TestForm>
    );

    await user.click(screen.getByRole("button", { name: "Edit You" }));

    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDone when the editing card's Save button is clicked", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="editing"
            onEdit={noop}
            onDone={onDone}
          />
        )}
      </TestForm>
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onDone).toHaveBeenCalled();
  });

  it("shows a remove button only when onRemove is given", () => {
    const { rerender } = render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
          />
        )}
      </TestForm>
    );
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();

    rerender(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
            onRemove={noop}
          />
        )}
      </TestForm>
    );
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("calls onRemove when its button is clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ registrant: { first: "", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
            onRemove={onRemove}
          />
        )}
      </TestForm>
    );

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalled();
  });

  it("shows the person's typed name instead of the positional title once one is entered", () => {
    render(
      <TestForm defaultValues={{ registrant: { first: "Jane", agreement: [] } }}>
        {(control) => (
          <PersonCard
            control={control}
            namePrefix="registrant"
            fields={fields}
            isRegistrant
            title="You"
            mode="summary"
            onEdit={noop}
            onDone={noop}
          />
        )}
      </TestForm>
    );

    expect(screen.getByText("Jane")).toBeInTheDocument();
  });
});
