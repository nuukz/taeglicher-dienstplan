import { NextResponse } from "next/server";
import type { Session } from "next-auth";

// ============================================================
// Zentrales Berechtigungssystem – ShiftHero WachPlan
// ============================================================

export type Rolle = "SYSOP" | "ADMIN" | "KOLLEGE";

const ROLE_LEVEL: Record<Rolle, number> = {
  SYSOP: 3,
  ADMIN: 2,
  KOLLEGE: 1,
};

/** Prueft ob die Rolle mindestens das geforderte Level hat */
export function hasMinRole(userRolle: string, minRole: Rolle): boolean {
  const userLevel = ROLE_LEVEL[userRolle as Rolle] ?? 0;
  const requiredLevel = ROLE_LEVEL[minRole];
  return userLevel >= requiredLevel;
}

/** SYSOP oder ADMIN */
export function isPrivileged(rolle: string): boolean {
  return hasMinRole(rolle, "ADMIN");
}

/** Nur SYSOP */
export function isSysop(rolle: string): boolean {
  return rolle === "SYSOP";
}

/**
 * API-Guard: Prueft ob die Session eine der erlaubten Rollen hat.
 * Gibt eine 403-Response zurueck wenn nicht berechtigt, sonst null.
 *
 * Beispiel:
 *   const denied = requireRole(session, "ADMIN");
 *   if (denied) return denied;
 */
export function requireRole(
  session: Session | null,
  ...allowedRoles: Rolle[]
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const userRolle = session.user.rolle as Rolle;

  // SYSOP hat immer Zugriff
  if (userRolle === "SYSOP") return null;

  if (!allowedRoles.includes(userRolle)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  return null;
}

/**
 * Gibt die Abteilungs-ID zurueck die der User sehen darf.
 * SYSOP → null (alle Abteilungen)
 * ADMIN/KOLLEGE → eigene abteilungId
 */
export function getAbteilungScope(user: {
  rolle: string;
  abteilungId: string;
}): string | null {
  if (isSysop(user.rolle)) return null;
  return user.abteilungId;
}
