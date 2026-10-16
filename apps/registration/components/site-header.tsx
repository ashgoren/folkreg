import { eventDateText, type EventConfig } from "@repo/tenant-config";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Theme } from "@/lib/theme";

type SiteHeaderProps = {
  event: Pick<EventConfig, "title" | "location" | "date" | "start" | "end">;
  theme: Theme;
};

// The event's name, dates, and location above every page, with the theme toggle upper right.
// Each detail is blank until the organizer fills it in on the admin's Event page.
export function SiteHeader({ event, theme }: SiteHeaderProps) {
  const dates = eventDateText(event);

  return (
    <header className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-4 py-6">
        <div>
          {event.title && <h1 className="text-2xl font-semibold">{event.title}</h1>}
          {dates && <p className="text-muted-foreground">{dates}</p>}
          {event.location && <p className="text-muted-foreground">{event.location}</p>}
        </div>
        <ThemeToggle initialTheme={theme} />
      </div>
    </header>
  );
}
