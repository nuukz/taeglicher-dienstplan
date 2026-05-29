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
- **User** - Kollegen mit Rolle (ADMIN/KOLLEGE), Beschaeftigung (BEAMTER/ANGESTELLTER), abteilungId
- **Abteilung** - Wachabteilungen (WA1, WA2, WA3), jeweils mit eigenen Fahrzeugen
- **Fahrzeug** - Einsatzfahrzeuge pro Abteilung, mit Positionen (FahrzeugPosition)
- **Sonderfunktion** - Zusaetzliche Funktionen (Wachhabender, Atemschutz, etc.)
- **Dienstplan** - Tagesplan pro Abteilung/Datum, mit `veroeffentlicht`-Flag
- **TagesFahrzeug** - Fahrzeug-Aktivierung pro Tag (aktiv/inaktiv)
- **Zuweisung** - Kollege → Position + Schicht + optional Sonderfunktion
- **Qualifikation** - Typen wie NotSan, RS, AGT, Masch, GF etc. mit Farbe + Kuerzel
- **UserQualifikation** - Many-to-Many Join (User ↔ Qualifikation)
- **Abwesenheit** - Pro User/Datum/Schicht mit Grund (KRANK, URLAUB, FORTBILDUNG, FREI, SONSTIGES)
- 3 Migrationen: `init`, `add_qualifikationen`, `add_abwesenheit`

## Bearbeitungs-Workflow (2 Schritte)
1. **Verfuegbarkeit** (`verfuegbarkeit-editor.tsx`): Wer ist abwesend? Grund waehlen per Select-Dropdown.
2. **Einteilen** (`einteilen-editor.tsx`): Split-View - links verfuegbare Kollegen mit Quali-Badges, rechts Fahrzeuge mit Positionen. Click-to-Assign: Person anklicken → Position anklicken → fertig.

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
