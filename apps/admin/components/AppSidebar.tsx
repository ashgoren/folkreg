"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronUp, ClipboardList, CreditCard, FileSignature, LogOut, Mail, Palette, Settings, Sheet, Ticket } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { logout } from "@/app/auth/logout/actions";

const navItems = [
  { href: "/dashboard/general", label: "General", icon: Settings },
  { href: "/dashboard/event", label: "Event", icon: CalendarDays },
  { href: "/dashboard/fields", label: "Fields", icon: ClipboardList },
  { href: "/dashboard/admissions", label: "Admissions", icon: Ticket },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/waivers", label: "Waivers", icon: FileSignature },
  { href: "/dashboard/receipts", label: "Receipts", icon: Mail },
  { href: "/dashboard/spreadsheet", label: "Spreadsheet", icon: Sheet },
  { href: "/dashboard/appearance", label: "Appearance", icon: Palette },
];

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <span className="font-mono font-normal text-base">FolkReg Admin</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname === href}>
                  <Link href={href}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <span className="flex-1 truncate text-sm">{userEmail}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onSelect={() => logout()}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
