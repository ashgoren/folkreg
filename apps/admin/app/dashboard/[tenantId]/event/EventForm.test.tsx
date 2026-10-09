import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { EventConfig } from "@repo/types";

vi.mock("./actions", () => ({ updateEvent: vi.fn() }));
import { updateEvent } from "./actions";
import { EventForm } from "./EventForm";
import type { EventValues } from "./schema";

// "Title" and "Location" each label two inputs (the event and its calendar entry), so inputs
// are looked up by their stable ids.
const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

const blankValues = (overrides: Partial<EventValues> = {}): EventValues => ({
  title: "",
  year: new Date().getFullYear(),
  location: "",
  date: "",
  timezone: "America/Los_Angeles",
  calendar: { title: "", description: "", location: "", start: "", end: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
  ...overrides,
});

const fullConfig: EventConfig = {
  title: "Spring Dance",
  year: 2027,
  location: "Example Hall",
  date: "April 2-4, 2027",
  timezone: "America/New_York",
  calendar: { title: "Spring Dance", description: "Contra", location: "Example Hall", start: "2027-04-02T19:00:00-04:00", end: "2027-04-04T15:00:00-04:00" },
  contacts: { info: "info@example.com", housing: "housing@example.com" },
  links: { info: "https://example.com", health: "https://example.com/health", safety: "https://example.com/safety" },
};

describe("EventForm", () => {
  beforeEach(() => {
    vi.mocked(updateEvent).mockReset().mockResolvedValue(null);
  });

  it("defaults a new tenant to blank fields, the current year, and a Pacific timezone", () => {
    render(<EventForm tenant={makeTenant()} />);
    expect(byId("event-title")).toHaveValue("");
    expect(byId("event-year")).toHaveValue(new Date().getFullYear());
    expect(byId("event-timezone")).toHaveValue("America/Los_Angeles");
    expect(byId("event-cal-title")).toHaveValue("");
    expect(byId("event-contact-info")).toHaveValue("");
  });

  it("populates every section from event_config", () => {
    render(<EventForm tenant={makeTenant({ event_config: fullConfig })} />);
    expect(byId("event-title")).toHaveValue("Spring Dance");
    expect(byId("event-year")).toHaveValue(2027);
    expect(byId("event-timezone")).toHaveValue("America/New_York");
    expect(byId("event-cal-start")).toHaveValue("2027-04-02T19:00:00-04:00");
    expect(byId("event-contact-housing")).toHaveValue("housing@example.com");
    expect(byId("event-link-safety")).toHaveValue("https://example.com/safety");
  });


  it("autosaves the whole form, including nested sections, as typed values", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<EventForm tenant={tenant} />);

    await user.type(byId("event-title"), "Fall Dance");
    await user.type(byId("event-cal-location"), "Grange Hall");
    await user.type(byId("event-contact-info"), "info@example.com");

    await expectLastSave(vi.mocked(updateEvent), tenant.id, blankValues({
      title: "Fall Dance",
      calendar: { title: "", description: "", location: "Grange Hall", start: "", end: "" },
      contacts: { info: "info@example.com", housing: "" },
    }));
  });

  it("saves the year as a number", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<EventForm tenant={tenant} />);

    await user.clear(byId("event-year"));
    await user.type(byId("event-year"), "2030");
    await expectLastSave(vi.mocked(updateEvent), tenant.id, blankValues({ year: 2030 }));
  });

  it("flags an out-of-range year and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<EventForm tenant={makeTenant()} />);

    await user.clear(byId("event-year"));
    await user.type(byId("event-year"), "1999");
    await user.tab();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(byId("event-year")).toHaveAttribute("aria-invalid", "true");
    await expectNoSave(vi.mocked(updateEvent));
  });

  it("flags a malformed info email and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<EventForm tenant={makeTenant()} />);

    await user.type(byId("event-contact-info"), "info-at-example");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be a valid email");
    await expectNoSave(vi.mocked(updateEvent));
  });

  it("flags a malformed housing email and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<EventForm tenant={makeTenant()} />);

    await user.type(byId("event-contact-housing"), "housing-at-example");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be a valid email");
    await expectNoSave(vi.mocked(updateEvent));
  });
});
