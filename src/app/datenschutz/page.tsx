import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – WachPlan",
};

// Hinweis: Gerüst nach Art. 13 DSGVO. Platzhalter in [eckigen Klammern] sowie
// Fristen/Verantwortliche muessen vom Datenschutzbeauftragten der
// Feuerwehr/Kommune geprueft und ausgefuellt werden.
export default function DatenschutzPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-10">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="size-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">
        Datenschutzerklärung
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13
        DSGVO
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            1. Verantwortlicher
          </h2>
          <p>
            [Name der Körperschaft / Feuerwehr], [Anschrift], [E-Mail].
            <br />
            Datenschutzbeauftragte/r: [Name / Kontakt].
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            2. Verarbeitete Daten
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Stammdaten: Vor- und Nachname, E-Mail, Beschäftigungsart, Rolle, Wachabteilung</li>
            <li>Qualifikationen und Funktionen</li>
            <li>
              Abwesenheiten mit Grund (u. a. „Krank&ldquo;) – hierbei können{" "}
              <strong>Gesundheitsdaten (besondere Kategorie nach Art. 9 DSGVO)</strong>{" "}
              verarbeitet werden
            </li>
            <li>Dienstplan- und Einteilungsdaten (Fahrzeug/Position/Schicht)</li>
            <li>Zugangsdaten (E-Mail, Passwort als Hash) und ggf. Push-Benachrichtigungs-Abonnements</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">3. Zwecke</h2>
          <p>
            Organisation und Dokumentation der Tagesdienstplanung (Einteilung
            auf Fahrzeuge/Positionen, Verfügbarkeiten, Vertretungen) im Rahmen
            des Dienstbetriebs.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            4. Rechtsgrundlagen
          </h2>
          <p>
            Verarbeitung im Beschäftigungskontext gemäß § 26 BDSG bzw. Art. 6
            Abs. 1 DSGVO. Gesundheitsbezogene Daten (z. B. Krankmeldungen)
            werden auf Grundlage von Art. 9 Abs. 2 DSGVO i. V. m. § 26 Abs. 3
            BSDG verarbeitet. [Bei Bedarf landesrechtliche Grundlage ergänzen.]
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">5. Empfänger</h2>
          <p>
            Die Anwendung wird auf Servern der Hetzner Online GmbH (Deutschland)
            betrieben. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung
            (Art. 28 DSGVO). Eine Weitergabe an Dritte zu eigenen Zwecken
            erfolgt nicht. Es findet keine Datenübermittlung in Drittländer
            statt.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            6. Speicherdauer
          </h2>
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie es für
            die genannten Zwecke erforderlich ist bzw. gesetzliche
            Aufbewahrungsfristen es verlangen. [Konkrete Löschfristen ergänzen.]
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            7. Cookies / Tracking
          </h2>
          <p>
            Es werden <strong>keine Tracking- oder Analyse-Dienste</strong> und
            keine Cookies zu Werbe- oder Reichweitenzwecken eingesetzt. Genutzt
            wird ausschließlich ein technisch notwendiges Sitzungs-Cookie für
            die Anmeldung. Optionale Push-Benachrichtigungen werden nur nach
            ausdrücklicher Zustimmung im Browser aktiviert.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            8. Ihre Rechte
          </h2>
          <p>
            Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
            Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
            Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Wenden
            Sie sich hierzu an den Verantwortlichen oder die/den
            Datenschutzbeauftragte/n. Zudem besteht ein Beschwerderecht bei der
            zuständigen Aufsichtsbehörde: [zuständige Datenschutz-Aufsichtsbehörde].
          </p>
        </section>

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Stand: dieser Entwurf ist ein technisches Gerüst und ersetzt keine
          Rechtsberatung. Die finalen Inhalte sind vom Datenschutzbeauftragten
          zu prüfen und freizugeben.
        </p>
      </div>
    </main>
  );
}
