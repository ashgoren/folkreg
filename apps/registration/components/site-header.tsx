import { eventDateText, type EventConfig } from "@repo/tenant-config";

type SiteHeaderProps = {
  event: Pick<EventConfig, "title" | "location" | "date" | "start" | "end">;
};

// The event's name, dates, and location above every page. Each is blank until the organizer fills
// it in on the admin's Event page, and is left out until then.
export function SiteHeader({ event }: SiteHeaderProps) {
  const dates = eventDateText(event);
  if (!event.title && !dates && !event.location) return null;

  return (
    <header className="border-b">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {event.title && <h1 className="text-2xl font-semibold">{event.title}</h1>}
        {dates && <p className="text-muted-foreground">{dates}</p>}
        {event.location && <p className="text-muted-foreground">{event.location}</p>}
      </div>
    </header>
  );
}
