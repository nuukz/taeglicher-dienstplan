import type { FahrzeugData } from "@/types/dienstplan";

// ============================================================
// Dienst-Status eines Fahrzeugs pro Tag/Schicht.
//
// Quelle der Wahrheit ist die Wochenvorlage (FahrzeugDienstzeit),
// damit Vorlagen-Aenderungen SOFORT und auch rueckwirkend wirken
// (kein Snapshot beim Anlegen). Ein manueller Tages-Override
// (TagesFahrzeug, gesetzt ueber den Aktiv/Aus-Schalter im Editor)
// hat Vorrang. Mitbesetzte Kinder erben den Status ihres
// Mutterfahrzeugs.
//
// Reihenfolge: manueller Override > Wochenvorlage > Default(im Dienst).
// ============================================================

export type Schicht = "TAG" | "NACHT";

/** Wochentag 0=Montag..6=Sonntag aus "YYYY-MM-DD" (UTC-konsistent zur Server-Logik). */
export function wochentagAusDatum(datum: string): number {
  const d = new Date(datum + "T00:00:00.000Z");
  return (d.getUTCDay() + 6) % 7;
}

/** Minimal-Form eines Tages-Overrides (aus TagesFahrzeug). */
type Override = { fahrzeugId: string; aktiv: boolean };

/**
 * Ist das Fahrzeug an diesem Datum/dieser Schicht im Dienst?
 * Mitbesetzte Kinder erben den Status der Mutter.
 */
export function istImDienst(
  fahrzeug: FahrzeugData,
  alleFahrzeuge: FahrzeugData[],
  overrides: Override[],
  datum: string,
  schicht: Schicht
): boolean {
  // Mitbesetztes Kind -> Status des Mutterfahrzeugs verwenden
  const parent = fahrzeug.parentFahrzeugId
    ? alleFahrzeuge.find((f) => f.id === fahrzeug.parentFahrzeugId)
    : undefined;
  const govern = parent ?? fahrzeug;

  // 0) Mutter (bzw. Fahrzeug selbst) global abgeschaltet -> nicht im Dienst.
  // So erbt ein mitbesetztes Kind auch das Global-Aus der Mutter.
  if (!govern.aktiv) return false;

  // 1) Manueller Tages-Override hat Vorrang
  const override = overrides.find((o) => o.fahrzeugId === govern.id);
  if (override) return override.aktiv;

  // 2) Wochenvorlage
  const wt = wochentagAusDatum(datum);
  const dz = govern.dienstzeiten?.find(
    (d) => d.wochentag === wt && d.schicht === schicht
  );
  if (dz) return dz.imDienst;

  // 3) Default: im Dienst
  return true;
}

/**
 * Menge der Fahrzeug-IDs, die in dieser Schicht NICHT im Dienst sind
 * (zum kompletten Ausblenden aus Anzeige/PDF/Editor).
 */
export function berechneAusserDienst(
  fahrzeuge: FahrzeugData[],
  overrides: Override[],
  datum: string,
  schicht: Schicht
): Set<string> {
  const out = new Set<string>();
  for (const f of fahrzeuge) {
    if (!istImDienst(f, fahrzeuge, overrides, datum, schicht)) {
      out.add(f.id);
    }
  }
  return out;
}
