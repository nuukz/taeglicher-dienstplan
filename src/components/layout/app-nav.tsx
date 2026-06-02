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
  Building2,
  Award,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRole, type Rolle } from "@/lib/permissions";
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
  minRole: Rolle;
}

const allNavItems: NavItem[] = [
  { href: "/dienstplan", label: "Dienstplan", icon: CalendarDays, minRole: "KOLLEGE" },
  { href: "/personal", label: "Personal", icon: Users, minRole: "ADMIN" },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: Truck, minRole: "SYSOP" as Rolle },
  { href: "/sonderfunktionen", label: "Sonderfunktionen", icon: Star, minRole: "SYSOP" as Rolle },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings, minRole: "SYSOP" as Rolle },
  { href: "/wachen", label: "Wachen", icon: Building2, minRole: "SYSOP" as Rolle },
  { href: "/qualifikationen", label: "Qualifikationen", icon: Award, minRole: "SYSOP" as Rolle },
];

const ROLE_LABELS: Record<Rolle, string> = {
  SYSOP: "System-Admin",
  ADMIN: "Administrator",
  KOLLEGE: "Kollege",
};

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        isActive
          ? "bg-red-600 text-white"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="truncate">{label}</span>
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
  rolle: Rolle;
  abteilungName: string;
}

export function DesktopSidebar({ vorname, rolle, abteilungName }: AppNavProps) {
  const visibleNavItems = allNavItems.filter((item) => hasMinRole(rolle, item.minRole));
  const waLabel = rolle === "SYSOP" ? "Systemverwaltung" : `WA ${abteilungName}`;

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col bg-zinc-950 border-r border-zinc-800">
      <Link href="/dienstplan" className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-4 hover:bg-zinc-900 transition-colors">
        <CalendarDays className="size-5 shrink-0 text-red-500" />
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white leading-tight">WachPlan</h1>
          <p className="truncate text-[10px] text-slate-400">{waLabel}</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 px-2.5 py-3">
        {visibleNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>
      <div className="border-t border-zinc-800 px-3 py-3">
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white">
            {vorname.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{vorname}</p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABELS[rolle]}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileHeader({ vorname, rolle, abteilungName }: AppNavProps) {
  const visibleNavItems = allNavItems.filter((item) => hasMinRole(rolle, item.minRole));
  const waLabel = rolle === "SYSOP" ? "Systemverwaltung" : `WA ${abteilungName}`;

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
            <Link href="/dienstplan" className="flex h-14 items-center gap-3 border-b border-slate-800 px-6 hover:bg-slate-800 transition-colors">
              <CalendarDays className="size-6 text-red-500" />
              <div>
                <span className="text-lg font-bold text-white">WachPlan</span>
                <p className="text-[10px] text-slate-400">{waLabel}</p>
              </div>
            </Link>
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
        <Link href="/dienstplan" className="text-base font-bold text-white hover:text-slate-200">
          WachPlan <span className="text-xs font-normal text-slate-400">{waLabel}</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-300">{vorname}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

export function MobileBottomNav({ rolle }: { rolle: Rolle }) {
  const visibleNavItems = allNavItems.filter((item) => hasMinRole(rolle, item.minRole));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-1 md:hidden">
      {visibleNavItems.map((item) => (
        <NavLinkMobile key={item.href} href={item.href} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );
}
