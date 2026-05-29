"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
    >
      <LogOut className="size-4" />
      <span className="hidden md:inline">Abmelden</span>
    </Button>
  );
}
