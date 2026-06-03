import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – WachPlan",
};

// Hinweis: Platzhalter in [eckigen Klammern] muessen vom Verantwortlichen /
// Datenschutzbeauftragten der Feuerwehr/Kommune ausgefuellt werden.
export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-10">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="size-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Impressum</h1>
      <p className="mt-1 text-sm text-slate-500">
        Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Diensteanbieter</h2>
          <p>
            [Name der Körperschaft / Feuerwehr]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Vertreten durch
          </h2>
          <p>[Vertretungsberechtigte Person / Funktion]</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Kontakt</h2>
          <p>
            Telefon: [Telefonnummer]
            <br />
            E-Mail: [E-Mail-Adresse]
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Zuständige Aufsichtsbehörde
          </h2>
          <p>[Zuständige Aufsichtsbehörde, falls einschlägig]</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">
            Datenschutzbeauftragte/r
          </h2>
          <p>
            [Name / Funktion]
            <br />
            E-Mail: [datenschutz@…]
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Haftungshinweis</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine
            Haftung für die Inhalte externer Links. Für den Inhalt der
            verlinkten Seiten sind ausschließlich deren Betreiber
            verantwortlich.
          </p>
        </section>

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Diese Anwendung („WachPlan&ldquo;) dient der internen Dienstplanung. Der
          Zugang ist Berechtigten vorbehalten.
        </p>
      </div>
    </main>
  );
}
