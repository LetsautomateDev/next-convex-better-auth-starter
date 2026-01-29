"use client";

import { LayoutDashboard, Settings, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Użytkownicy",
    url: "/users",
    icon: UserCog,
  },
  {
    title: "Ustawienia",
    url: "/settings",
    icon: Settings,
    disabled: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <Link href="/" className="flex items-center px-4 py-4 h-16">
          <span className="text-xl font-bold text-primary">Starter</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-[11px] font-semibold uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.disabled}
                    isActive={!item.disabled && pathname === item.url}
                    tooltip={
                      item.disabled ? `${item.title} (wkrótce)` : item.title
                    }
                    size="lg"
                    className={cn(
                      "transition-colors",
                      "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                      "data-[active=true]:border-l-2 data-[active=true]:border-l-primary data-[active=true]:rounded-l-none",
                      item.disabled &&
                        "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {item.disabled ? (
                      <span className="flex items-center gap-2">
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span className="font-medium">{item.title}</span>
                      </span>
                    ) : (
                      <Link href={item.url}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
