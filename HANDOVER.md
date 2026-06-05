# Handover – ShiftHero WachPlan

Stand: 4. Juni 2026. Alles committet & gepusht. `master` (`6c61817`) ist live deployt & verifiziert (Service `active`, HTTP 200).

## Live
- **URL:** https://wachplan.dev.squidion.de — aktueller `master`-Stand ist deployt.
- **Geplante Domain `bfhh.dev`:** Lenny will künftig `bfhh.dev` nutzen. Stand jetzt löst die Domain NICHT auf (NXDOMAIN, auch extern) – DNS noch nicht gesetzt. Zum Aktivieren: DNS-A-Record `bfhh.dev` → `128.140.124.33`, dann nginx-vhost + Certbot anlegen. „Auf bfhh.dev deployen" meint aktuell faktisch den bestehenden Server.
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
- **NEU (Session 4. Juni, live):**
  - **Dienstzeit-Vorlage ist jetzt „lebende Quelle":** Fahrzeug-Dienst-Status (im Dienst pro Datum/Schicht) wird LIVE aus der Wochenvorlage abgeleitet statt nur einmalig beim Anlegen vorbelegt. Vorlagen-Änderungen wirken **sofort und rückwirkend** (auch auf bestehende Tage). Zentraler Helper `src/lib/dienstzeit.ts`: Reihenfolge **manueller Tages-Override (TagesFahrzeug) > Wochenvorlage > Default(im Dienst)**. Genutzt von allen 4 Anzeige-Stellen (`dienstplan/page.tsx`, `einteilen-editor.tsx`, `kontrolle-versenden.tsx`, `pdf-export.ts`). POST `/api/dienstplan` belegt nicht mehr vor; `/api/fahrzeuge` liefert `dienstzeiten[]`; Dienstzeiten-PUT macht Vollersatz (deleteMany+createMany).
  - **Mitbesetzte Kinder erben den Status der Mutter** (im Dienst, Vorlage UND Global-`aktiv=false`). Dienstzeiten-Editor blendet Kinder aus (Einstellung wäre wirkungslos). Audit-Bugs (Kind sichtbar trotz Mutter-Aus) behoben.
  - **Außer-Dienst-Fahrzeuge komplett ausgeblendet** statt nur ausgegraut – Anzeige, PDF, Kontrolle. Im Einteilen-Editor wandern sie in einen einklappbaren Bereich „Außer Dienst (N)" mit „Einsetzen"-Knopf (Ausnahme-Tag).
  - **Fahrzeug-Positionen löschbar trotz bestehender Einteilungen:** DELETE-Route entfernt in einer Transaktion erst die abhängigen Zuweisungen, dann die Position (Foreign-Key-Block behoben); meldet die Anzahl entfernter Einteilungen. UI mit Bestätigungs-Dialog (`(app)/fahrzeuge/page.tsx`).
  - **Schnell-Vertretung:** In Schritt 1 (Verfügbarkeit) Button „Schnell-Vertretung" (Dropdown mit allen Qualis). Ein Klick legt sofort eine Tagesvertretung mit der gewählten Qualifikation an – generischer Name (`<Kürzel>, Vertretung`), Auto-Nummerierung. Der alte „Vertretung"-Dialog bleibt. Datei: `verfuegbarkeit-editor.tsx`.
  - **Azubis bekommen NIE eine Sonderfunktion:** Select beim Einteilen für Azubis ausgeblendet (`einteilen-editor.tsx`) UND serverseitig erzwungen (`sonderfunktionId=null` in `api/dienstplan/zuweisung/route.ts`).
  - **Sonderfunktionen echt löschbar:** Lösch-Button + Bestätigungs-Dialog (`(app)/sonderfunktionen/page.tsx`). DELETE = HARD-Delete (entfernt Funktion vorab aus Zuweisungen) statt Soft-Delete. Deaktivieren-Toggle bleibt zusätzlich.

> **WICHTIG – Dora-Befund (4. Juni, auf Live geprüft):** Doras Live-Vorlage steht auf **Wochenende (Sa+So) Tag+Nacht aus**, aber **Mo–Fr Nacht = AN**. Darum erscheint Dora unter der Woche nachts weiterhin – das ist KEIN Bug, sondern die Vorlage war nie auf „nachts aus" gesetzt. Fix für Lenny: Einstellungen → Fahrzeug-Dienstzeiten → RTW Dora → Mo–Fr „Nacht" auf „–" → Speichern (wirkt sofort). **Nur Dora** hat überhaupt eine Vorlage (14 Einträge); alle anderen Fahrzeuge = immer im Dienst. Nur 3 harmlose Alt-Overrides (Dora So 31.05. Nacht), keine DB-Bereinigung nötig.
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
