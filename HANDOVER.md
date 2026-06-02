# Handover – ShiftHero WachPlan

Stand: 2. Juni 2026. Alles committet & gepusht (`master`, `design/v1-bold`, `design/v2-mira`).

## Live
- **URL:** https://wachplan.dev.squidion.de — läuft, aktueller `master`-Stand ist deployt.
- **Server:** Hetzner, `root@128.140.124.33` (Host „squidion"), SSH-Key `~/.ssh/id_ed25519`.
- **App:** `/opt/apps/wachplan`, systemd `wachplan.service` (Next.js auf :3002), nginx + Certbot (HTTPS) davor.
- **DB:** PostgreSQL lokal auf dem Server, DB `wachplan`. Backups: `/opt/apps/wachplan/db-backup-*.sql.gz`.
- **Demo-Logins aktiv** (Flag `NEXT_PUBLIC_DEMO_LOGIN=true` in der Server-`.env`): SYSOP `sysop@shifthero.de`/`sysop123`, Admin WA1–3 `admin@feuerwehr.de` / `o.richter@…` / `j.schaefer@…` (alle `admin123`).

## Redeploy (Server aktualisieren)
```bash
ssh root@128.140.124.33
cd /opt/apps/wachplan
pg_dump "$(grep ^DATABASE_URL= .env | sed -E 's/^DATABASE_URL=//;s/"//g;s/\?.*$//')" | gzip > db-backup-$(date +%F-%H%M).sql.gz
git fetch origin && git reset --hard origin/master
npm install && npx prisma generate && npx prisma migrate deploy
npm run build && systemctl restart wachplan.service
```
Hinweis: `.env` auf dem Server hat ein starkes `NEXTAUTH_SECRET` (44 Zeichen). `git push` deployt NICHT automatisch.

## Diese Session umgesetzt (auf master + live)
- **Features:** Fahrzeug-Dienstzeiten (SYSOP-Wochenraster), Mit-Besetzung (GW MANV←HLF, GW←Kaufmann), Tagesvertretung, Kontroll-Schritt vor dem Versenden, SYSOP-Abteilungs-Umschalter, „Anzahl Plätze" beim Fahrzeug-Anlegen.
- **Security-Hardening** (eigenes Audit): Login Rate-Limiting + Timing-Schutz, inaktive/Vertretungs-Accounts nicht einloggbar, Session 8h, Secret-Guard, IDOR/Mass-Assignment geschlossen, Security-Header, strikte Zod-Validierung, Demo-Login nur per Flag.
- **Umlaute** (ü/ä/ö/ß) in allen UI-Texten.
- **Design:** Version 2 (shadcn-Preset b5KIUN7cH, zinc/red, clean) ist auf master + live. Schmalere Sidebar (w-56).
- **UX:** Einteilen lädt nicht mehr die ganze Seite neu / springt nicht nach oben (stiller Refetch).
- **ELW live korrigiert:** Wachabteilungsführer + Fahrer (Doppel-Eintrag „WAF" entfernt).

## OFFEN / nächste Schritte
- ⚠️ **Live-Demo-Daten sind noch alte Struktur** (nur Schema migriert, nicht neu geseedet): RTWs 2 statt 3 Plätze, HLF 8 statt 6, **kein GW**, keine Mit-Besetzung. **Entscheidung offen:** Live-DB einmal **sauber neu seeden** (überschreibt Demo-Dienstpläne; Backup vorhanden) → dann alles konsistent. Lokal/`prisma/seed.ts` ist bereits korrekt.
- Design `design/v1-bold` ist die nicht gewählte Alternative (kräftiges Rot, Gradient-Sidebar) — kann gelöscht werden.
- `j.schaefer`-Login: Server-DB hat ggf. anderen Stand – beim Re-Seed mit erledigt.

## Branches
- `master` – Live-Stand (v2-Design).
- `design/v1-bold` – Design-Alternative (experimentell).
- `design/v2-mira` – = master (kann aufgeräumt werden).
