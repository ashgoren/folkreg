import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { EventConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateEvent: vi.fn() }));
import { updateEvent } from "./actions";
import { EventForm } from "./EventForm";

// Inputs are looked up by their stable ids.
const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

const blankValues = (overrides: Partial<EventConfig> = {}): EventConfig => ({
  title: "",
  location: "",
  start: "",
  end: "",
  timezone: "America/Los_Angeles",
  date: "",
  calendar: { show: false, description: "", location: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
  ...overrides,
});

const fullConfig: EventConfig = {
  title: "Spring Dance",
  location: "Example Hall",
  start: "2027-04-02T19:00",
  end: "2027-04-04T15:00",
  timezone: "America/New_York",
  date: "Easter weekend",
  calendar: { show: true, description: "Contra", location: "123 Main St, Springfield, MA 01103" },
  contacts: { info: "info@example.com", housing: "housing@example.com" },
  links: { info: "https://example.com", health: "https://example.com/health", safety: "https://example.com/safety" },
};

describe("EventForm", () => {
  beforeEach(() => {
    vi.mocked(updateEvent).mockReset().mockResolvedValue(null);
  });

  it("defaults a new tenant to blank fields, a Pacific timezone, and no calendar links", () => {
    render(<EventForm tenant={makeTenant()} />);
    expect(byId("event-title")).toHaveValue("");
    expect(byId("event-start")).toHaveValue("");
    expect(byId("event-timezone")).toHaveValue("America/Los_Angeles");
    expect(screen.getByRole("switch", { name: /Add to calendar/ })).not.toBeChecked();
    expect(byId("event-contact-info")).toHaveValue("");
  });

  // Derived from the start, and from the event's own title and times.
  it("has no year field, and no calendar title or times", () => {
    render(<EventForm tenant={makeTenant()} />);
    for (const id of ["event-year", "event-cal-title", "event-cal-start", "event-cal-end"]) expect(byId(id)).toBeNull();
  });

  it("populates every section from event_config", () => {
    render(<EventForm tenant={makeTenant({ event_config: fullConfig })} />);
    expect(byId("event-title")).toHaveValue("Spring Dance");
    expect(byId("event-start")).toHaveValue("2027-04-02T19:00");
    expect(byId("event-end")).toHaveValue("2027-04-04T15:00");
    expect(byId("event-timezone")).toHaveValue("America/New_York");
    expect(byId("event-date")).toHaveValue("Easter weekend");
    expect(screen.getByRole("switch", { name: /Add to calendar/ })).toBeChecked();
    expect(byId("event-cal-location")).toHaveValue("123 Main St, Springfield, MA 01103");
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
    await user.tab();

    await expectLastSave(vi.mocked(updateEvent), tenant.id, blankValues({
      title: "Fall Dance",
      calendar: { show: false, description: "", location: "Grange Hall" },
      contacts: { info: "info@example.com", housing: "" },
    }));
  });

  describe("start and end", () => {
    it("save as the event's own clock time", async () => {
      const tenant = makeTenant();
      render(<EventForm tenant={tenant} />);
      expect(byId("event-start")).toHaveAttribute("type", "datetime-local");

      fireEvent.change(byId("event-start"), { target: { value: "2027-10-01T19:00" } });
      fireEvent.blur(byId("event-start"));
      fireEvent.change(byId("event-end"), { target: { value: "2027-10-03T15:00" } });
      fireEvent.blur(byId("event-end"));
      await expectLastSave(vi.mocked(updateEvent), tenant.id, blankValues({ start: "2027-10-01T19:00", end: "2027-10-03T15:00" }));
    });

    it("flags an end before the start and doesn't save it", async () => {
      render(<EventForm tenant={makeTenant({ event_config: blankValues({ start: "2027-10-01T19:00" }) })} />);

      fireEvent.change(byId("event-end"), { target: { value: "2027-09-30T15:00" } });
      fireEvent.blur(byId("event-end"));

      expect(await screen.findByText("Must be after the start")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateEvent));
    });

    // jsdom doesn't model a half-typed date-time, so this reports it the way a browser does: an
    // empty value, with validity.badInput set.
    it("flags a half-typed date and time rather than saving it as blank", async () => {
      render(<EventForm tenant={makeTenant({ event_config: blankValues({ start: "2027-10-01T19:00" }) })} />);
      Object.defineProperty(byId("event-start"), "validity", { value: { badInput: true } });

      fireEvent.change(byId("event-start"), { target: { value: "" } });
      fireEvent.blur(byId("event-start"));

      expect(await screen.findByText("Must be a date and time")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateEvent));
    });
  });

  describe("calendar links", () => {
    // Links without times would be broken calendar entries.
    it("need a start and end before they're saved as shown", async () => {
      const user = userEvent.setup();
      render(<EventForm tenant={makeTenant()} />);

      await user.click(screen.getByRole("switch", { name: /Add to calendar/ }));

      expect(await screen.findAllByText("Needed for the calendar links")).toHaveLength(2);
      await expectNoSave(vi.mocked(updateEvent));
    });

    it("save as shown once there are times", async () => {
      const event = blankValues({ start: "2027-10-01T19:00", end: "2027-10-03T15:00" });
      const tenant = makeTenant({ event_config: event });
      const user = userEvent.setup();
      render(<EventForm tenant={tenant} />);

      await user.click(screen.getByRole("switch", { name: /Add to calendar/ }));
      await expectLastSave(vi.mocked(updateEvent), tenant.id, { ...event, calendar: { ...event.calendar, show: true } });
    });
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

  // Without "https://", the link would point at a page on the registration site itself.
  it("flags a link without https:// and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<EventForm tenant={makeTenant()} />);

    await user.type(byId("event-link-safety"), "example.org/safety");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be a web address starting with https://");
    await expectNoSave(vi.mocked(updateEvent));
  });

  // A choice from a list is a complete gesture, so it saves right away, as a switch does.
  it("offers the US timezones and saves a choice immediately", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<EventForm tenant={tenant} />);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Eastern", "Central", "Mountain", "Arizona (no DST)", "Pacific", "Alaska", "Hawaii",
    ]);
    await user.selectOptions(byId("event-timezone"), "Mountain");
    await expectLastSave(vi.mocked(updateEvent), tenant.id, blankValues({ timezone: "America/Denver" }));
  });
});
