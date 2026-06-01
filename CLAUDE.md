# ShiftHero - WachPlan

## Was ist das?
Tagesdienstplan-System fuer die Feuerwehr. Admins (Wachhabende) teilen Kollegen auf Fahrzeuge und Positionen ein, pro Schicht (TAG/NACHT). Jede Wachabteilung sieht nur ihre eigene Abteilung.

## Tech-Stack
- **Framework:** Next.js 14 (App Router, TypeScript)
- **UI:** Tailwind CSS + @base-ui/react (NICHT @radix-ui!) + shadcn/ui
- **DB:** Prisma ORM mit PostgreSQL 16 (via `@prisma/adapter-pg`)
- **Auth:** NextAuth v5 (beta.25), Credentials-Provider, JWT-Strategie
- **PDF:** jsPDF + jspdf-autotable
- **PWA:** manifest.json + VAPID Web Push

## WICHTIG: Bekannte Eigenheiten
- **@base-ui/react statt @radix-ui**: Die UI-Komponenten (Select, Sheet, etc.) nutzen `@base-ui/react`. API ist anders als Radix! Select `onValueChange` hat Signatur `(value: SelectValueType | null, eventDetails)` - nicht `(value: string)`.
- **Prisma adapter-pg**: Nutzt `@prisma/adapter-pg` mit `pg` Pool. Connection String in `.env` als `DATABASE_URL`.
- **NextAuth trustHost**: `trustHost: true` ist in `src/lib/auth.config.ts` gesetzt (notwendig fuer lokalen Betrieb).
- **PostgreSQL Auth**: `pg_hba.conf` wurde auf `md5` umgestellt (war `peer`). Port 5432.

## Repo & Deployment
- **Git:** `git@github.com:nuukz/taeglicher-dienstplan.git` (Branch: master)
- **Lokal:** Laeuft auf `http://localhost:3000` via `npm start` (Production Build)
- **Env-Vars:** `.env` (nicht im Git!) - DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, VAPID-Keys

## Datenmodell (Prisma)
- **User** - Kollegen mit Rolle (SYSOP/ADMIN/KOLLEGE), Beschaeftigung (BEAMTER/ANGESTELLTER/AZUBI), abteilungId. Azubis sind wachabteilungsuebergreifend und erscheinen in allen WA-Einteilungen.
- **Abteilung** - Wachabteilungen (WA1, WA2, WA3)
- **Fahrzeug** - Einsatzfahrzeuge, mit Positionen (FahrzeugPosition). GLOBAL (geteilter Fuhrpark, kein `abteilungId`, `name` ist `@unique`) - alle Abteilungen nutzen dieselben Fahrzeuge. Verwaltung nur durch SYSOP.
- **Sonderfunktion** - Zusaetzliche Funktionen (Wachhabender, Atemschutz, etc.). GLOBAL, SYSOP-verwaltet.
- **Dienstplan** - Tagesplan pro Abteilung/Datum, mit `veroeffentlicht`-Flag
- **TagesFahrzeug** - Fahrzeug-Aktivierung pro Tag (aktiv/inaktiv)
- **Zuweisung** - Kollege → Position + Schicht + optional Sonderfunktion
- **Qualifikation** - Typen wie NotSan, RS, AGT, Masch, GF etc. mit Farbe + Kuerzel
- **UserQualifikation** - Many-to-Many Join (User ↔ Qualifikation)
- **Abwesenheit** - Pro User/Datum/Schicht mit Grund (KRANK, URLAUB, FORTBILDUNG, FREI, SONSTIGES)
- **FahrzeugDienstzeit** - Wochenvorlage pro Fahrzeug (Wochentag 0=Mo..6=So × TAG/NACHT, `imDienst`). SYSOP-verwaltet. Beim Dienstplan-Anlegen werden nicht-im-Dienst-Fahrzeuge automatisch als inaktiv vorbelegt.
- **Fahrzeug.parentFahrzeugId** (Self-Relation "MitBesetzung") - mitbesetzte Fahrzeuge spiegeln die Mannschaft des Mutterfahrzeugs (GW MANV ← HLF, GW ← RTW Kaufmann). Helper: `src/lib/mitbesetzung.ts`. Kinder werden nicht separat eingeteilt, zaehlen nicht doppelt.
- **User.vertretungFuerDatum** - Tagesvertretung (Aushilfe nur fuer ein Datum; Platzhalter-Account, nicht einloggbar). Erscheint nur am Datum in der Verfuegbarkeitsliste (`/api/personal?datum=`).
- 6 Migrationen: `init`, `add_qualifikationen`, `add_abwesenheit`, `add_fahrzeug_dienstzeit`, `add_fahrzeug_mitbesetzung`, `add_tagesvertretung`

## Berechtigungen & Abteilungstrennung (WICHTIG)
Zentrale Helper in `src/lib/permissions.ts`. Jede schreibende/lesende API-Route muss sie nutzen:
- **Rollen:** SYSOP (alles, abteilungsuebergreifend) > ADMIN (Wachhabender, nur eigene WA) > KOLLEGE.
- **Abteilungstrennung:** ADMIN/KOLLEGE duerfen NUR ihre eigene Abteilung sehen/aendern. `abteilungId` kommt NIE ungeprueft aus Query/Body - immer gegen `session.user.abteilungId` validieren via `requireAbteilung(session, abteilungId)` bzw. `darfAbteilung(...)`. Bei per-ID adressierten Objekten (Dienstplan, Zuweisung, User) erst laden, dann Abteilung pruefen.
- **Azubi-Ausnahme:** Azubis sind WA-uebergreifend - `darfUser(session, user)` laesst Zugriff fuer jede WA zu.
- **Globale Stammdaten (Fahrzeug, Sonderfunktion, SchichtKonfiguration, Abteilung, Qualifikation):** Schreiben nur SYSOP (`requireRole(session, "SYSOP")`), Lesen fuer alle. ADMIN darf sie NICHT aendern (wuerde alle WA betreffen).
- **Rollen-Eskalation:** SYSOP-Rolle und Abteilungswechsel nur durch SYSOP vergebbar (in den Personal-Routen geprueft, nicht nur im Zod-Schema).

## Bearbeitungs-Workflow (3 Schritte)
1. **Verfuegbarkeit** (`verfuegbarkeit-editor.tsx`): Wer ist abwesend? Grund waehlen per Select-Dropdown. Button "Vertretung" legt eine Tagesvertretung (Aushilfe nur fuer diesen Tag, mit Qualis) an.
2. **Einteilen** (`einteilen-editor.tsx`): Split-View - links verfuegbare Kollegen mit Quali-Badges, rechts Fahrzeuge mit Positionen. Click-to-Assign + Drag&Drop. Button fuehrt zu Schritt 3 (nicht direkt senden).
3. **Kontrolle & Versenden** (`kontrolle-versenden.tsx`): Uebersicht pro Schicht (besetzt/offen), Warnung bei offenen Positionen, dann bewusst "Jetzt veroeffentlichen & senden".

## SYSOP-Vollzugriff
SYSOP kann ueber einen Abteilungs-Umschalter (`?wa=` in `/dienstplan` + `/dienstplan/bearbeiten`) jede WA ansehen UND bearbeiten. Sidebar zeigt "Systemverwaltung". APIs lassen SYSOP per `darfAbteilung`/`getAbteilungScope` ueberall zu.

## Sicherheit / Hardening (WICHTIG)
- Login: konstanter Dummy-bcrypt (kein Timing-Leak), In-Memory-Rate-Limiting (`src/lib/rate-limit.ts`, 10/15min pro E-Mail+IP), E-Mail case-insensitive. Inaktive Accounts + Tagesvertretungen sind NICHT einloggbar (SYSOP ist `aktiv=true`).
- Session `maxAge` 8h; Secret-Guard wirft in Produktion bei Platzhalter/zu kurzem `AUTH_SECRET`.
- Security-Header in `next.config.mjs` (X-Frame-Options, nosniff, Referrer/Permissions-Policy, CSP frame-ancestors; HSTS nur Prod). `poweredByHeader: false`.
- Login-Schnellbuttons (Demo-Creds) nur in Entwicklung (`NODE_ENV !== "production"`).
- Zod: Datums-Format YYYY-MM-DD, Zeit 00:00–23:59, Laengen-/Array-Limits, Passwort min 12.

## Design-Branches (experimentell, nicht master)
- `design/v1-bold` - kraeftiges Rot, Gradient-Sidebar, runde Ecken, Tiefen-Hintergrund.
- `design/v2-mira` - shadcn-Preset b5KIUN7cH (zinc/red, medium radius), clean/flach.
Master nutzt weiterhin das urspruengliche Design.

## Seed-Daten
61 User ueber 3 Wachabteilungen, 12 Qualifikationstypen. Logins:
- `admin@feuerwehr.de` / `admin123` (Admin WA1)
- `o.richter@feuerwehr.de` / `admin123` (Admin WA2)
- `j.schaefer@feuerwehr.de` / `admin123` (Admin WA3)

## Dateistruktur (wichtige Dateien)
```
prisma/schema.prisma                              - Datenmodell
prisma/seed.ts                                    - Mock-Daten (61 User, 12 Qualis)
src/app/(app)/dienstplan/page.tsx                 - Dienstplan-Ansicht (nur eigene Abteilung)
src/app/(app)/dienstplan/bearbeiten/page.tsx      - 2-Schritt-Editor (Stepper)
src/components/dienstplan/verfuegbarkeit-editor.tsx - Schritt 1
src/components/dienstplan/einteilen-editor.tsx     - Schritt 2 (Split-View)
src/types/dienstplan.ts                           - Shared TypeScript-Types
src/app/api/abwesenheit/route.ts                  - Abwesenheiten CRUD
src/app/api/dienstplan/route.ts                   - Dienstplan laden
src/app/api/dienstplan/zuweisung/route.ts         - Zuweisungen CRUD
src/lib/pdf-export.ts                             - PDF-Generierung (A4 Querformat)
src/lib/auth.config.ts                            - NextAuth Konfiguration
src/lib/validations.ts                            - Zod-Schemas
src/components/layout/app-nav.tsx                 - Sidebar + Mobile Nav
```

## Commands
```bash
npm run dev          # Dev-Server
npm run build        # Production Build
npm start            # Production starten
npm run db:migrate   # Prisma Migrationen ausfuehren
npm run db:seed      # Seed-Daten laden
npm run db:reset     # DB zuruecksetzen + Seed (braucht PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="ja")
npx prisma generate  # Client nach Schema-Aenderungen regenerieren
```

## Offene Punkte / Naechste Schritte
- App auf Hetzner-Server deployen (CPX32, Ubuntu 24.04, Nginx Reverse Proxy)
- Domain einrichten (*.squidion.de)
- Schwester-Projekt: **ShiftHero - AzubiPlan** (Ausbildungsplanung)
- GitHub-Repo ggf. umbenennen (aktuell noch "taeglicher-dienstplan")
