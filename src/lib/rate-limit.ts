// Einfaches In-Memory-Rate-Limiting (Sliding-Window pro Schluessel).
// Ausreichend fuer den Single-Server-Betrieb (Hetzner). Zaehler werden bei
// Server-Neustart zurueckgesetzt — das ist fuer Brute-Force-Schutz akzeptabel.

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 Minuten
const LOGIN_MAX_ATTEMPTS = 10;

/**
 * Zaehlt einen Versuch und meldet, ob das Limit ueberschritten ist.
 * @returns true wenn blockiert (zu viele Versuche im Zeitfenster).
 */
export function loginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

/** Setzt den Zaehler zurueck (z.B. nach erfolgreichem Login). */
export function loginRateLimitReset(key: string): void {
  store.delete(key);
}

// Gelegentliches Aufraeumen abgelaufener Eintraege, damit die Map nicht waechst.
function cleanup() {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}
// alle 30 Minuten aufraeumen (kein unref noetig im Server-Kontext)
if (typeof setInterval !== "undefined") {
  const t = setInterval(cleanup, 30 * 60 * 1000);
  // Node: Timer soll den Prozess nicht am Beenden hindern
  if (typeof t === "object" && t && "unref" in t) (t as { unref: () => void }).unref();
}
