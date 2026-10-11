import { formatDateTime, type RegistrationStatus, type Timezone } from "@repo/tenant-config";

// Every status but open. Typed this way, the page can't hand this component an open status, and
// message() below has to handle each of the rest.
export type ClosedStatus = Exclude<RegistrationStatus, { state: "open" }>;

type ClosedPageProps = {
  status: ClosedStatus; // the reason registration isn't open, for the message
  timezone: Timezone; // event timezone, for formatting the opensAt date if needed
  websiteUrl: string; // event website, for a link to it if registration is closed
};

// What public sees while registration isn't available (the only placeholder that exists).
export function ClosedPage({ status, timezone, websiteUrl }: ClosedPageProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{message(status, timezone)}</h2>
      {websiteUrl && (
        <p>
          <a href={websiteUrl} className="underline underline-offset-4">Visit the event website</a>
        </p>
      )}
    </div>
  );
}

// Declared to return a string, so leaving a status out of the switch is a type error.
const message = (status: ClosedStatus, timezone: Timezone): string => {
  switch (status.state) {
    // Neutral rather than "closed", since this is also what a tenant that has never opened shows.
    case "closed":
      return "Registration is not currently available.";
    case "not-yet-open":
      return `Registration opens ${formatDateTime(status.opensAt, timezone)}.`;
    case "past-closing-time":
      return "Registration is closed.";
    case "full":
      return "Registration is full.";
  }
};
