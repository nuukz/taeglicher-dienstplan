"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  Truck,
  Star,
  Settings,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

const allNavItems: NavItem[] = [
  { href: "/dienstplan", label: "Dienstplan", icon: CalendarDays, adminOnly: false },
  { href: "/personal", label: "Personal", icon: Users, adminOnly: true },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: Truck, adminOnly: true },
  { href: "/sonderfunktionen", label: "Sonderfunktionen", icon: Star, adminOnly: true },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings, adminOnly: true },
];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-red-700 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </Link>
  );
}

function NavLinkMobile({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
        isActive ? "text-red-500" : "text-slate-400 hover:text-slate-600"
      )}
    >
      <Icon className={cn("size-5", isActive && "text-red-500")} />
      <span>{label}</span>
    </Link>
  );
}

interface AppNavProps {
  vorname: string;
  isAdmin: boolean;
}

export function DesktopSidebar({ vorname, isAdmin }: AppNavProps) {
  const visibleNavItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-slate-900">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <CalendarDays className="size-6 text-red-500" />
        <h1 className="text-lg font-bold text-white">Dienstplan</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
            {vorname.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{vorname}</p>
            <p className="text-xs text-slate-400">{isAdmin ? "Administrator" : "Kollege"}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileHeader({ vorname, isAdmin }: AppNavProps) {
  const visibleNavItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-900 px-4 md:hidden">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-slate-900 p-0 border-slate-800">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-6">
              <CalendarDays className="size-6 text-red-500" />
              <span className="text-lg font-bold text-white">Dienstplan</span>
            </div>
            <nav className="space-y-1 px-3 py-4">
              {visibleNavItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </nav>
            <div className="mt-auto border-t border-slate-800 px-4 py-4">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-bold text-white">Dienstplan</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-300">{vorname}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

export function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const visibleNavItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-1 md:hidden">
      {visibleNavItems.map((item) => (
        <NavLinkMobile key={item.href} href={item.href} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );
}
