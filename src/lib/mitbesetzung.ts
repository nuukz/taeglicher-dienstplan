import type { FahrzeugData } from "@/types/dienstplan";

// ============================================================
// Mit-Besetzung: Fahrzeuge mit parentFahrzeugId spiegeln die
// Mannschaft ihres Mutterfahrzeugs (z.B. GW MANV <- HLF, GW <- Kaufmann).
// ============================================================

/** Ist dieses Fahrzeug ein mitbesetztes Kind (spiegelt einen Parent)? */
export function istMitbesetzt(fahrzeug: FahrzeugData): boolean {
  return !!fahrzeug.parentFahrzeugId;
}

/**
 * Liefert die fuer die Anzeige relevanten Positionen eines Fahrzeugs sowie
 * den Namen des Mutterfahrzeugs (falls mitbesetzt). Mitbesetzte Fahrzeuge
 * zeigen die Positionen ihres Parents (gespiegelte Mannschaft).
 */
export function getAnzeigeQuelle(
  fahrzeug: FahrzeugData,
  alleFahrzeuge: FahrzeugData[]
): { positionen: FahrzeugData["positionen"]; mitbesetztVon: string | null } {
  if (fahrzeug.parentFahrzeugId) {
    const parent = alleFahrzeuge.find((f) => f.id === fahrzeug.parentFahrzeugId);
    if (parent) {
      return { positionen: parent.positionen, mitbesetztVon: parent.name };
    }
  }
  return { positionen: fahrzeug.positionen, mitbesetztVon: null };
}

/** Fahrzeuge, die eigenstaendig eingeteilt werden (keine mitbesetzten Kinder). */
export function einteilbareFahrzeuge(fahrzeuge: FahrzeugData[]): FahrzeugData[] {
  return fahrzeuge.filter((f) => !f.parentFahrzeugId);
}
