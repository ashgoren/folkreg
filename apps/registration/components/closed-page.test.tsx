import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClosedPage, type ClosedStatus } from "./closed-page";

const TIMEZONE = "America/Los_Angeles";

describe("ClosedPage", () => {
  it.each<[ClosedStatus, string]>([
    [{ state: "closed" }, "Registration is not currently available."],
    [{ state: "not-yet-open", opensAt: "2026-11-01T12:00" }, "Registration opens November 1, 2026 at 12:00 PM PST."],
    [{ state: "past-closing-time", closesAt: "2026-11-15T12:00" }, "Registration is closed."],
    [{ state: "full", people: 400 }, "Registration is full."],
  ])("says why for %j", (status, message) => {
    render(<ClosedPage status={status} timezone={TIMEZONE} websiteUrl="" />);

    expect(screen.getByRole("heading", { name: message })).toBeInTheDocument();
  });

  it("writes an opening time on the event's own clock", () => {
    render(<ClosedPage status={{ state: "not-yet-open", opensAt: "2026-12-01T12:00" }} timezone="America/New_York" websiteUrl="" />);

    expect(screen.getByRole("heading", { name: "Registration opens December 1, 2026 at 12:00 PM EST." })).toBeInTheDocument();
  });

  it("links to the event's website when there is one", () => {
    render(<ClosedPage status={{ state: "closed" }} timezone={TIMEZONE} websiteUrl="https://springdance.org" />);

    expect(screen.getByRole("link", { name: "Visit the event website" })).toHaveAttribute("href", "https://springdance.org");
  });

  it("has no link without a website", () => {
    render(<ClosedPage status={{ state: "closed" }} timezone={TIMEZONE} websiteUrl="" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
