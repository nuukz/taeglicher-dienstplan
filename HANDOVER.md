# Handover – ShiftHero WachPlan

Stand: 3. Juni 2026. Alles committet & gepusht. `master` ist live deployt.

## Live
- **URL:** https://wachplan.dev.squidion.de — aktueller `master`-Stand ist deployt.
- **Server:** Hetzner, `root@128.140.124.33` (Host „squidion"), SSH-Key `~/.ssh/id_ed25519`.
- **App:** `/opt/apps/wachplan`, systemd `wachplan.service` (Next.js auf :3002, **läuft als root – Backlog**), nginx + Certbot (HTTPS).
- **DB:** PostgreSQL lokal, DB `wachplan`. Backups (manuell): `/opt/apps/wachplan/db-backup-*.sql.gz`. `?schema=public` für psql/pg_dump abschneiden.
- **Server-Hygiene aktiv:** UFW, fail2ban, unattended-upgrades.
- **Demo-Logins aktiv** (`NEXT_PUBLIC_DEMO_LOGIN=true`): SYSOP `sysop@shifthero.de`/`sysop123`, Admin WA1–3 (`admin@feuerwehr.de`, `o.richter@…`, `j.schaefer@…`) je `admin123`.

## Redeploy (manuell, `git push` deployt NICHT automatisch)
```bash
ssh root@128.140.124.33
cd /opt/apps/wachplan
pg_dump "$(grep ^DATABASE_URL= .env | sed -E 's/^DATABASE_URL=//;s/"//g;s/\?.*$//')" | gzip > db-backup-$(date +%F-%H%M).sql.gz
git fetch origin && git reset --hard origin/master
npm install && npx prisma generate && npx prisma migrate deploy
npm run build && systemctl restart wachplan.service
```

## Bisher umgesetzt (master + live)
- **Features:** Fahrzeug-Dienstzeiten (SYSOP-Wochenraster), Mit-Besetzung (GW MANV←HLF, GW←Kaufmann), Tagesvertretung, Kontroll-Schritt vor Versenden, SYSOP-Abteilungs-Umschalter, „Anzahl Plätze" beim Anlegen.
- **Security-Hardening** (eigenes Audit): Rate-Limiting + Timing-Schutz beim Login, inaktive/Vertretungs-Accounts nicht einloggbar, Session 8h, Secret-Guard, IDOR/Mass-Assignment zu, Security-Header, strikte Zod-Validierung, Demo-Login nur per Flag.
- **Umlaute** (ü/ä/ö/ß) in allen UI-Texten.
- **Design Version 2** (shadcn-Preset b5KIUN7cH, zinc/red, clean) auf master + live; Sidebar schmaler (w-56).
- **UX:** Einteilen lädt nicht mehr neu / springt nicht nach oben (stiller Refetch).
- **ELW live korrigiert:** Wachabteilungsführer + Fahrer (Doppel-„WAF" entfernt).
- **DSGVO Phase 1 (NEU, live):** `/impressum` (§5 DDG) + `/datenschutz` (Art. 13) öffentlich, Footer-Links. Org-Angaben sind Platzhalter `[…]` → vom DSB ausfüllen lassen.

## OFFEN / Backlog (priorisiert)
**Sofort entscheidbar:**
- ⚠️ **Live-Demo-Daten neu seeden:** Prod hat noch ALTE Struktur (RTWs 2 statt 3 Plätze, HLF 8 statt 6, kein GW, keine Mit-Besetzung). `prisma/seed.ts` lokal ist korrekt. Re-Seed überschreibt Demo-Dienstpläne (Backup vorhanden). Wartet auf „ja".

**DSGVO (rechtlich):**
- Gesundheitsdaten minimieren: Abwesenheits-Grund (KRANK) nur für Berechtigte / nach außen nur „abwesend".
- Echtes Löschen (Art. 17) + Datenexport (Art. 15) – aktuell nur Soft-Delete (`aktiv=false`).
- Löschkonzept: Auto-Cleanup alter Dienstpläne/Abwesenheiten (Timer).
- Organisatorisch (Kommune/DSB): AVV mit Hetzner, Verzeichnis Art. 30, DSFA, Platzhalter in Impressum/Datenschutz füllen.

**Technische Lücken:**
- P1 App läuft als **root** → eigener Service-User (`User=` in systemd-Unit).
- P1 **Keine automatischen WachPlan-DB-Backups** → täglicher pg_dump-Timer mit Rotation.
- P2 **Keine Tests** → Vitest für `src/lib/permissions.ts` + `validations.ts` + API-Routen.
- P2 **Keine CI** → GitHub Actions (typecheck/lint/build).
- P2 **Env-Validierung** beim Start (zod) für DB/Secrets/VAPID.
- P3 `/api/health`-Endpoint; alte Dienste `shifthero-backend/-frontend`/`git-auto-push` prüfen/abschalten; Passwort-Reset (braucht E-Mail); strengere CSP; a11y.

## Branches
- `master` – Live-Stand (v2-Design).
- `design/v1-bold` – nicht gewählte Design-Alternative (kann gelöscht werden).
- `design/v2-mira` – = master (kann gelöscht werden).
