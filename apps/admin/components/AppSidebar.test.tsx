import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/app/auth/logout/actions", () => ({ logout: vi.fn() }));
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/logout/actions";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";

const SECTIONS = [
  ["General", "general"],
  ["Event", "event"],
  ["Fields", "fields"],
  ["Admissions", "admissions"],
  ["Payments", "payments"],
  ["Waivers", "waivers"],
  ["Receipts", "receipts"],
  ["Spreadsheet", "spreadsheet"],
  ["Appearance", "appearance"],
] as const;

const renderSidebar = (pathname: string) => {
  vi.mocked(usePathname).mockReturnValue(pathname);
  return render(
    <SidebarProvider>
      <AppSidebar userEmail="organizer@example.com" tenantId={TENANT_ID} />
    </SidebarProvider>,
  );
};

describe("AppSidebar", () => {
  it("links every config section under the current tenant, in order", () => {
    renderSidebar(`/dashboard/${TENANT_ID}/general`);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(SECTIONS.map(([label]) => label));
    for (const [label, path] of SECTIONS) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/dashboard/${TENANT_ID}/${path}`);
    }
  });

  it("marks only the link for the current path as active", () => {
    renderSidebar(`/dashboard/${TENANT_ID}/payments`);
    for (const [label] of SECTIONS) {
      // shadcn's SidebarMenuButton renders data-active="true"/"false" onto the Link via asChild.
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("data-active", String(label === "Payments"));
    }
  });

  it("shows the signed-in user's email and logs out from the account menu", async () => {
    const user = userEvent.setup();
    renderSidebar(`/dashboard/${TENANT_ID}/general`);

    await user.click(screen.getByRole("button", { name: /organizer@example\.com/ }));
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: /Log out/ }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
