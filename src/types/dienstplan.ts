// Shared Types für Dienstplan-Modul

export interface Abteilung {
  id: string;
  name: string;
}

export interface QualifikationData {
  id: string;
  kuerzel: string;
  name: string;
  farbe: string;
}

export interface UserData {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER" | "AZUBI";
  aktiv: boolean;
  abteilungId: string;
  qualifikationen?: { qualifikation: QualifikationData }[];
}

export interface FahrzeugData {
  id: string;
  name: string;
  typ: string;
  aktiv: boolean;
  reihenfolge: number;
  parentFahrzeugId?: string | null; // mitbesetzt von diesem Fahrzeug (spiegelt dessen Mannschaft)
  positionen: FahrzeugPositionData[];
}

export interface FahrzeugPositionData {
  id: string;
  name: string;
  fahrzeugId: string;
  reihenfolge: number;
  requiredQualifikationen?: { qualifikation: QualifikationData }[];
}

export interface SonderfunktionData {
  id: string;
  name: string;
  aktiv: boolean;
}

export interface ZuweisungData {
  id: string;
  dienstplanId: string;
  userId: string;
  fahrzeugPositionId: string;
  sonderfunktionId: string | null;
  user: UserData;
  fahrzeugPosition: FahrzeugPositionData & { fahrzeug: FahrzeugData };
  sonderfunktion: SonderfunktionData | null;
}

export interface TagesFahrzeugData {
  id: string;
  dienstplanId: string;
  fahrzeugId: string;
  aktiv: boolean;
  fahrzeug: FahrzeugData;
}

export interface DienstplanAenderungData {
  id: string;
  version: number;
  userId: string | null;
  beschreibung: string;
  snapshot: string | null;
  createdAt: string;
  user?: { vorname: string; nachname: string } | null;
}

export interface DienstplanData {
  id: string;
  datum: string;
  schicht: "TAG" | "NACHT";
  abteilungId: string;
  veroeffentlicht: boolean;
  version: number;
  zuweisungen: ZuweisungData[];
  tagesFahrzeuge: TagesFahrzeugData[];
  aenderungen?: DienstplanAenderungData[];
}

export interface DienstplanResponse {
  datum: string;
  abteilungId: string;
  tag: DienstplanData | null;
  nacht: DienstplanData | null;
}

export interface SchichtKonfiguration {
  id: string;
  schicht: "TAG" | "NACHT";
  startZeit: string;
  endZeit: string;
}

export interface AbwesenheitData {
  id: string;
  userId: string;
  datum: string;
  schicht: "TAG" | "NACHT" | null;
  grund: "KRANK" | "URLAUB" | "FORTBILDUNG" | "FREI" | "SONSTIGES";
  notiz: string | null;
}
