"use client";

import { useWatch, type Control } from "react-hook-form";
import { formatDateTime, registrationConfigSchema, registrationStatus, type RegistrationConfig, type RegistrationStatus, type Timezone } from "@repo/tenant-config";

const MODE_TEXT: Record<RegistrationConfig["mode"], string> = {
  pay: "registrants pay right away",
  lottery: "registrants enter the lottery",
  waitlist: "registrants join the waitlist",
};

/**
 * One line saying what the settings below add up to at page load, e.g. "Opens November 1, 2026 at
 * 12:00 PM PST · closes November 15, 2026 at 12:00 PM PST · registrants enter the lottery". Worked
 * out from the form's current values, so it follows each edit, by the same registrationStatus the
 * registration app decides with. The admin can't count orders, so a people limit is described
 * rather than checked.
 */
export function RegistrationSummary({ control, timezone, now }: { control: Control<RegistrationConfig>; timezone: Timezone; now: number }) {
  const values = useWatch({ control });
  // A value mid-edit (a half-typed date, a cleared number) has no meaning to summarize yet; its
  // field shows the error.
  const parsed = registrationConfigSchema.safeParse(values);
  if (!parsed.success) return <p className="text-sm text-muted-foreground">Fix the settings below to see when registration is open.</p>;

  const at = (localDateTime: string) => formatDateTime(localDateTime, timezone);
  const [headline, ...details] = summary(parsed.data, registrationStatus(parsed.data, timezone, new Date(now), null), at);

  return (
    <p className="text-sm">
      <strong>{headline}</strong>
      {details.map((detail) => ` · ${detail}`)}
    </p>
  );
}

// The status first, then for a form that's open or will open, what follows.
const summary = (config: RegistrationConfig, status: RegistrationStatus, at: (localDateTime: string) => string): string[] => {
  switch (status.state) {
    case "closed":
      return ["Closed"];
    case "past-closing-time":
      return [`Closed since ${at(status.closesAt)}`];
    // Not reached here: without a count, the people limit is described under "open" instead.
    case "full":
      return [`Closed after ${status.people} people`];
    case "not-yet-open":
      return [`Opens ${at(status.opensAt)}`, ...upcoming(config, at)];
    case "open":
      return ["Open now", ...upcoming(config, at)];
  }
};

// When registration closes, and what a submission becomes.
const upcoming = (config: RegistrationConfig, at: (localDateTime: string) => string) => [
  ...(config.closeAt.enabled ? [`closes ${at(config.closeAt.at)}`] : []),
  ...(config.closeAfter.enabled ? [`closes after ${config.closeAfter.people} people`] : []),
  MODE_TEXT[config.mode],
  ...(config.mode === "pay" && config.waitlistAfter.enabled ? [`waitlisted after ${config.waitlistAfter.people} people`] : []),
];
