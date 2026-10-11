import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { defaultEventConfig, type EventConfig } from "@repo/tenant-config";
import { SiteHeader } from "./site-header";

const event = (overrides: Partial<EventConfig>): EventConfig => ({ ...defaultEventConfig(), ...overrides });

describe("SiteHeader", () => {
  it("shows the event's title, dates, and location", () => {
    render(<SiteHeader event={event({
      title: "Spring Dance", start: "2027-04-02T19:00", end: "2027-04-04T15:00", location: "Grange Hall",
    })} />);

    expect(screen.getByRole("heading", { name: "Spring Dance" })).toBeInTheDocument();
    expect(screen.getByText("April 2–4, 2027")).toBeInTheDocument();
    expect(screen.getByText("Grange Hall")).toBeInTheDocument();
  });

  it("shows the organizer's own date wording in place of the range", () => {
    render(<SiteHeader event={event({ title: "Spring Dance", start: "2027-04-02T19:00", date: "Early April" })} />);

    expect(screen.getByText("Early April")).toBeInTheDocument();
    expect(screen.queryByText("April 2, 2027")).not.toBeInTheDocument();
  });

  it("leaves out what isn't filled in yet", () => {
    render(<SiteHeader event={event({ title: "Spring Dance" })} />);

    expect(screen.getByRole("heading", { name: "Spring Dance" })).toBeInTheDocument();
    expect(screen.getByRole("banner").querySelectorAll("p")).toHaveLength(0);
  });

  it("renders nothing for an event with nothing filled in", () => {
    const { container } = render(<SiteHeader event={defaultEventConfig()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
