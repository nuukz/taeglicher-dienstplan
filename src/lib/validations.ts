import { z } from "zod";

// Gemeinsame Bausteine (Hardening: Format- und Laengen-Grenzen)
const datumString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD sein");
const emailNorm = z
  .string()
  .email("Ungültige E-Mail-Adresse")
  .max(254)
  .toLowerCase()
  .trim();
const passwort = z
  .string()
  .min(12, "Passwort muss mindestens 12 Zeichen haben")
  .max(128);
const personName = z.string().min(1).max(100);
const zeitHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Zeit muss HH:MM (00:00–23:59) sein");
const qualiIdArray = z.array(z.string().min(1).max(64)).max(50);

// --- Personal ---

export const createUserSchema = z.object({
  email: emailNorm,
  passwort,
  vorname: personName,
  nachname: personName,
  rolle: z.enum(["SYSOP", "ADMIN", "KOLLEGE"]).default("KOLLEGE"),
  beschaeftigung: z.enum(["BEAMTER", "ANGESTELLTER", "AZUBI"]),
  abteilungId: z.string().min(1, "Wachabteilung ist erforderlich"),
});

export const createVertretungSchema = z.object({
  vorname: personName,
  nachname: personName,
  datum: datumString,
  abteilungId: z.string().min(1, "Wachabteilung ist erforderlich"),
  qualifikationIds: qualiIdArray.optional(),
});

export const updateUserSchema = z.object({
  email: emailNorm.optional(),
  passwort: passwort.optional(),
  vorname: personName.optional(),
  nachname: personName.optional(),
  rolle: z.enum(["SYSOP", "ADMIN", "KOLLEGE"]).optional(),
  beschaeftigung: z.enum(["BEAMTER", "ANGESTELLTER", "AZUBI"]).optional(),
  abteilungId: z.string().min(1).optional(),
  aktiv: z.boolean().optional(),
});

// --- Fahrzeuge ---

export const createFahrzeugSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  typ: z.string().min(1, "Typ ist erforderlich").max(100),
  reihenfolge: z.number().int().min(0).max(9999).default(0),
  // Optionale Standard-Besatzung: legt beim Anlegen so viele Plaetze an
  anzahlPlaetze: z.number().int().min(0).max(20).optional(),
});

export const updateFahrzeugSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  typ: z.string().min(1).max(100).optional(),
  reihenfolge: z.number().int().min(0).max(9999).optional(),
  aktiv: z.boolean().optional(),
});

export const createPositionSchema = z.object({
  name: z.string().min(1, "Positionsname ist erforderlich").max(100),
  reihenfolge: z.number().int().min(0).max(9999).default(0),
  requiredQualifikationIds: qualiIdArray.optional(),
});

export const deletePositionSchema = z.object({
  positionId: z.string().min(1, "Position-ID ist erforderlich"),
});

export const updateFahrzeugDienstzeitSchema = z.object({
  fahrzeugId: z.string().min(1, "Fahrzeug-ID ist erforderlich"),
  eintraege: z
    .array(
      z.object({
        wochentag: z.number().int().min(0).max(6), // 0 = Montag ... 6 = Sonntag
        schicht: z.enum(["TAG", "NACHT"]),
        imDienst: z.boolean(),
      })
    )
    .max(14, "Maximal 14 Einträge (7 Tage x 2 Schichten)"),
});

// --- Sonderfunktionen ---

export const createSonderfunktionSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
});

export const updateSonderfunktionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  aktiv: z.boolean().optional(),
});

// --- Dienstplan ---

export const createDienstplanSchema = z.object({
  datum: datumString, // "2026-05-29"
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
  datum: datumString,
  schicht: z.enum(["TAG", "NACHT"]).optional().nullable(),
  grund: z.enum(["KRANK", "URLAUB", "FORTBILDUNG", "FREI", "SONSTIGES"]),
  notiz: z.string().max(2000).optional().nullable(),
});

export const deleteAbwesenheitSchema = z.object({
  userId: z.string().min(1, "User-ID ist erforderlich"),
  datum: datumString,
  schicht: z.enum(["TAG", "NACHT"]).optional().nullable(),
});

// --- Abteilung ---

export const createAbteilungSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(50),
});

export const updateAbteilungSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

// --- Qualifikation ---

export const createQualifikationSchema = z.object({
  kuerzel: z.string().min(1, "Kürzel ist erforderlich").max(20),
  name: z.string().min(1, "Name ist erforderlich").max(100),
  farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ungültige Farbe").default("#6b7280"),
});

export const updateQualifikationSchema = z.object({
  kuerzel: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// --- Einstellungen ---

export const updateSchichtKonfigurationSchema = z.object({
  schicht: z.enum(["TAG", "NACHT"]),
  startZeit: zeitHHMM,
  endZeit: zeitHHMM,
});
