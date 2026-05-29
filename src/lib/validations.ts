import { z } from "zod";

// --- Personal ---

export const createUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  passwort: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string().min(1, "Nachname ist erforderlich"),
  rolle: z.enum(["ADMIN", "KOLLEGE"]).default("KOLLEGE"),
  beschaeftigung: z.enum(["BEAMTER", "ANGESTELLTER"]),
  abteilungId: z.string().min(1, "Wachabteilung ist erforderlich"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").optional(),
  passwort: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben").optional(),
  vorname: z.string().min(1).optional(),
  nachname: z.string().min(1).optional(),
  rolle: z.enum(["ADMIN", "KOLLEGE"]).optional(),
  beschaeftigung: z.enum(["BEAMTER", "ANGESTELLTER"]).optional(),
  abteilungId: z.string().min(1).optional(),
  aktiv: z.boolean().optional(),
});

// --- Fahrzeuge ---

export const createFahrzeugSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  typ: z.string().min(1, "Typ ist erforderlich"),
  reihenfolge: z.number().int().default(0),
});

export const updateFahrzeugSchema = z.object({
  name: z.string().min(1).optional(),
  typ: z.string().min(1).optional(),
  reihenfolge: z.number().int().optional(),
  aktiv: z.boolean().optional(),
});

export const createPositionSchema = z.object({
  name: z.string().min(1, "Positionsname ist erforderlich"),
  reihenfolge: z.number().int().default(0),
});

export const deletePositionSchema = z.object({
  positionId: z.string().min(1, "Position-ID ist erforderlich"),
});

// --- Sonderfunktionen ---

export const createSonderfunktionSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
});

export const updateSonderfunktionSchema = z.object({
  name: z.string().min(1).optional(),
  aktiv: z.boolean().optional(),
});

// --- Dienstplan ---

export const createDienstplanSchema = z.object({
  datum: z.string().min(1, "Datum ist erforderlich"), // "2026-05-29"
  schicht: z.enum(["TAG", "NACHT"]),
  abteilungId: z.string().min(1, "Wachabteilung ist erforderlich"),
});

// --- Zuweisung ---

export const createZuweisungSchema = z.object({
  dienstplanId: z.string().min(1, "Dienstplan-ID ist erforderlich"),
  userId: z.string().min(1, "User-ID ist erforderlich"),
  fahrzeugPositionId: z.string().min(1, "Fahrzeugposition-ID ist erforderlich"),
  sonderfunktionId: z.string().optional().nullable(),
});

export const deleteZuweisungSchema = z.object({
  zuweisungId: z.string().min(1, "Zuweisungs-ID ist erforderlich"),
});

// --- Veroeffentlichen ---

export const veroeffentlichenSchema = z.object({
  dienstplanId: z.string().min(1, "Dienstplan-ID ist erforderlich"),
});

// --- TagesFahrzeug ---

export const tagesFahrzeugSchema = z.object({
  dienstplanId: z.string().min(1, "Dienstplan-ID ist erforderlich"),
  fahrzeugId: z.string().min(1, "Fahrzeug-ID ist erforderlich"),
  aktiv: z.boolean(),
});

// --- Abwesenheit ---

export const createAbwesenheitSchema = z.object({
  userId: z.string().min(1, "User-ID ist erforderlich"),
  datum: z.string().min(1, "Datum ist erforderlich"),
  schicht: z.enum(["TAG", "NACHT"]).optional().nullable(),
  grund: z.enum(["KRANK", "URLAUB", "FORTBILDUNG", "FREI", "SONSTIGES"]),
  notiz: z.string().optional().nullable(),
});

export const deleteAbwesenheitSchema = z.object({
  userId: z.string().min(1, "User-ID ist erforderlich"),
  datum: z.string().min(1, "Datum ist erforderlich"),
  schicht: z.enum(["TAG", "NACHT"]).optional().nullable(),
});

// --- Einstellungen ---

export const updateSchichtKonfigurationSchema = z.object({
  schicht: z.enum(["TAG", "NACHT"]),
  startZeit: z.string().regex(/^\d{2}:\d{2}$/, "Format muss HH:MM sein"),
  endZeit: z.string().regex(/^\d{2}:\d{2}$/, "Format muss HH:MM sein"),
});
