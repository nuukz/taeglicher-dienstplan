"use client";

import {
  Loader2,
  Send,
  ChevronLeft,
  Check,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DienstplanData,
  FahrzeugData,
  SchichtKonfiguration,
} from "@/types/dienstplan";
import { getAnzeigeQuelle } from "@/lib/mitbesetzung";
import { berechneAusserDienst } from "@/lib/dienstzeit";

interface KontrolleVersendenProps {
  datum: string;
  abteilungName: string;
  tagDienstplan: DienstplanData | null;
  nachtDienstplan: DienstplanData | null;
  fahrzeuge: FahrzeugData[];
  schichtZeiten: SchichtKonfiguration[];
  publishing: boolean;
  onZurueck: () => void;
  onPublish: () => void;
}

function zeitraum(
  schicht: "TAG" | "NACHT",
  zeiten: SchichtKonfiguration[]
): string {
  const z = zeiten.find((s) => s.schicht === schicht);
  if (z) return `${z.startZeit} – ${z.endZeit}`;
  return schicht === "TAG" ? "07:00 – 19:00" : "19:00 – 07:00";
}

interface Uebersicht {
  fahrzeuge: {
    name: string;
    mitbesetztVon: string | null;
    positionen: { name: string; person: string | null }[];
  }[];
  sonderfunktionen: string[];
  total: number;
  besetzt: number;
  offen: number;
}

function berechneUebersicht(
  dienstplan: DienstplanData | null,
  fahrzeuge: FahrzeugData[],
  datum: string,
  schicht: "TAG" | "NACHT"
): Uebersicht {
  const deaktiviert = berechneAusserDienst(
    fahrzeuge,
    dienstplan?.tagesFahrzeuge ?? [],
    datum,
    schicht
  );
  const zuwByPos = new Map<string, string>();
  const sonderfunktionen: string[] = [];
  for (const z of dienstplan?.zuweisungen ?? []) {
    zuwByPos.set(z.fahrzeugPositionId, `${z.user.nachname}, ${z.user.vorname}`);
    if (z.sonderfunktion) {
      sonderfunktionen.push(`${z.sonderfunktion.name}: ${z.user.nachname}`);
    }
  }

  const sichtbar = fahrzeuge
    .filter((f) => f.aktiv && !deaktiviert.has(f.id))
    .sort((a, b) => a.reihenfolge - b.reihenfolge);

  let total = 0;
  let besetzt = 0;
  const fz = sichtbar.map((f) => {
    const { positionen: quellPos, mitbesetztVon } = getAnzeigeQuelle(
      f,
      fahrzeuge
    );
    const positionen = quellPos.map((p) => {
      const person = zuwByPos.get(p.id) ?? null;
      // Mitbesetzte Fahrzeuge spiegeln nur und werden NICHT mitgezaehlt
      // (sonst wuerde die Mannschaft doppelt gezaehlt).
      if (!mitbesetztVon) {
        total += 1;
        if (person) besetzt += 1;
      }
      return { name: p.name, person };
    });
    return { name: f.name, mitbesetztVon, positionen };
  });

  return {
    fahrzeuge: fz,
    sonderfunktionen,
    total,
    besetzt,
    offen: total - besetzt,
  };
}

function SchichtKontrolle({
  schicht,
  zeit,
  datum,
  dienstplan,
  fahrzeuge,
}: {
  schicht: "TAG" | "NACHT";
  zeit: string;
  datum: string;
  dienstplan: DienstplanData | null;
  fahrzeuge: FahrzeugData[];
}) {
  const u = berechneUebersicht(dienstplan, fahrzeuge, datum, schicht);
  const existiert = !!dienstplan;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {schicht === "TAG" ? (
              <Sun className="size-4 text-amber-500" />
            ) : (
              <Moon className="size-4 text-indigo-500" />
            )}
            {schicht === "TAG" ? "Tagschicht" : "Nachtschicht"}
            <span className="text-sm font-normal text-slate-400">({zeit})</span>
          </CardTitle>
          {existiert && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                u.offen === 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {u.offen === 0 ? (
                <Check className="size-3" />
              ) : (
                <AlertTriangle className="size-3" />
              )}
              {u.besetzt}/{u.total} besetzt
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!existiert ? (
          <p className="text-sm text-slate-400">
            Kein Plan für diese Schicht vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {u.fahrzeuge.map((f) => (
                <div
                  key={f.name}
                  className="rounded-lg border border-slate-200 p-2"
                >
                  <p className="mb-1 text-sm font-semibold text-slate-800">
                    {f.name}
                    {f.mitbesetztVon && (
                      <span className="ml-1 text-xs font-normal text-blue-600">
                        (von {f.mitbesetztVon})
                      </span>
                    )}
                  </p>
                  <ul className="space-y-0.5">
                    {f.positionen.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-slate-500">{p.name}</span>
                        {p.person ? (
                          <span className="font-medium text-slate-900">
                            {p.person}
                          </span>
                        ) : (
                          <span className="font-medium text-amber-600">
                            offen
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {u.sonderfunktionen.length > 0 && (
              <div className="text-xs text-slate-600">
                <span className="font-semibold">Sonderfunktionen: </span>
                {u.sonderfunktionen.join(" · ")}
              </div>
            )}
            {u.offen > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="size-3.5" />
                {u.offen}{" "}
                {u.offen === 1 ? "Position ist" : "Positionen sind"} noch nicht
                besetzt.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KontrolleVersenden({
  datum,
  abteilungName,
  tagDienstplan,
  nachtDienstplan,
  fahrzeuge,
  schichtZeiten,
  publishing,
  onZurueck,
  onPublish,
}: KontrolleVersendenProps) {
  const datumLabel = new Date(datum + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const istUpdate =
    !!tagDienstplan?.veroeffentlicht || !!nachtDienstplan?.veroeffentlicht;

  // Gesamt-offen über beide Schichten
  const tagU = berechneUebersicht(tagDienstplan, fahrzeuge, datum, "TAG");
  const nachtU = berechneUebersicht(nachtDienstplan, fahrzeuge, datum, "NACHT");
  const offenGesamt = tagU.offen + nachtU.offen;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onZurueck}>
            <ChevronLeft className="size-4" />
            Einteilen
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Schritt 3: Kontrolle &amp; Versenden
            </h2>
            <p className="text-sm text-slate-500">
              Wachabteilung {abteilungName} · {datumLabel}
            </p>
          </div>
        </div>
        <Button
          onClick={onPublish}
          disabled={publishing}
          className={
            istUpdate
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {istUpdate ? "Aktualisieren & an alle senden" : "Jetzt veröffentlichen & senden"}
        </Button>
      </div>

      {/* Hinweis bei offenen Positionen */}
      {offenGesamt > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Es {offenGesamt === 1 ? "ist" : "sind"} insgesamt{" "}
            <strong>{offenGesamt}</strong>{" "}
            {offenGesamt === 1 ? "Position" : "Positionen"} noch nicht besetzt.
            Du kannst trotzdem senden – prüfe das aber bitte vorher.
          </span>
        </div>
      )}

      {/* Schichten */}
      <SchichtKontrolle
        schicht="TAG"
        zeit={zeitraum("TAG", schichtZeiten)}
        datum={datum}
        dienstplan={tagDienstplan}
        fahrzeuge={fahrzeuge}
      />
      <SchichtKontrolle
        schicht="NACHT"
        zeit={zeitraum("NACHT", schichtZeiten)}
        datum={datum}
        dienstplan={nachtDienstplan}
        fahrzeuge={fahrzeuge}
      />

      {/* Versenden unten nochmal */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onPublish}
          disabled={publishing}
          size="lg"
          className={
            istUpdate
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {istUpdate ? "Aktualisieren & an alle senden" : "Jetzt veröffentlichen & senden"}
        </Button>
      </div>
    </div>
  );
}
