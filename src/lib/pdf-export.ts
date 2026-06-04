import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  DienstplanData,
  FahrzeugData,
  SchichtKonfiguration,
  ZuweisungData,
} from "@/types/dienstplan";
import { getAnzeigeQuelle } from "@/lib/mitbesetzung";
import { berechneAusserDienst } from "@/lib/dienstzeit";

function getSchichtZeitraum(
  schicht: "TAG" | "NACHT",
  schichtZeiten: SchichtKonfiguration[]
): string {
  const config = schichtZeiten.find((s) => s.schicht === schicht);
  if (config) return `${config.startZeit} \u2013 ${config.endZeit}`;
  return schicht === "TAG" ? "07:00 \u2013 19:00" : "19:00 \u2013 07:00";
}

function formatDatumDE(datum: string): string {
  const d = new Date(datum + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function exportDienstplanPdf({
  datum,
  abteilungName,
  tag,
  nacht,
  fahrzeuge,
  schichtZeiten,
}: {
  datum: string;
  abteilungName: string;
  tag: DienstplanData | null;
  nacht: DienstplanData | null;
  fahrzeuge: FahrzeugData[];
  schichtZeiten: SchichtKonfiguration[];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const activeFahrzeuge = fahrzeuge
    .filter((f) => f.aktiv)
    .sort((a, b) => a.reihenfolge - b.reihenfolge);

  // Titel
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Tagesdienstplan \u2013 Wachabteilung ${abteilungName}`,
    14,
    15
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(formatDatumDE(datum), 14, 21);

  let yPos = 28;

  // Funktion fuer Schicht-Tabelle
  function renderSchichtTabelle(
    schichtLabel: string,
    zeitraum: string,
    schicht: "TAG" | "NACHT",
    dienstplan: DienstplanData | null,
    startY: number
  ): number {
    // Außer Dienst = aus Wochenvorlage + manuellen Overrides (lebende Vorlage).
    const deactivated = berechneAusserDienst(
      fahrzeuge,
      dienstplan?.tagesFahrzeuge ?? [],
      datum,
      schicht
    );

    const shownRaw = activeFahrzeuge.filter((f) => !deactivated.has(f.id));
    // Mitbesetzte Fahrzeuge (GW MANV, GW) spiegeln die Positionen ihres Mutterfahrzeugs
    const shownFahrzeuge = shownRaw.map((f) => {
      const q = getAnzeigeQuelle(f, fahrzeuge);
      return {
        label: q.mitbesetztVon ? `${f.name} (von ${q.mitbesetztVon})` : f.name,
        positionen: q.positionen,
      };
    });

    // Zuweisungen-Map
    const zuweisungByPosition = new Map<string, ZuweisungData>();
    if (dienstplan) {
      for (const z of dienstplan.zuweisungen) {
        zuweisungByPosition.set(z.fahrzeugPositionId, z);
      }
    }

    // Header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${schichtLabel} (${zeitraum})`, 14, startY);
    startY += 3;

    // Maximale Positionen fuer Zeilenanzahl
    const maxPositionen = Math.max(
      ...shownFahrzeuge.map((f) => f.positionen.length),
      1
    );

    // Spaltenkoepfe
    const head = [["Position", ...shownFahrzeuge.map((f) => f.label)]];

    // Tabellenzeilen
    const body: string[][] = [];
    for (let i = 0; i < maxPositionen; i++) {
      const row: string[] = [];
      // Positionsname (vom Fahrzeug mit den meisten Positionen, oder allgemein)
      const posNames = shownFahrzeuge
        .map((f) => f.positionen[i]?.name || "")
        .filter(Boolean);
      row.push(posNames[0] || `Position ${i + 1}`);

      for (const fz of shownFahrzeuge) {
        const pos = fz.positionen[i];
        if (!pos) {
          row.push("");
          continue;
        }
        const zuweisung = zuweisungByPosition.get(pos.id);
        if (zuweisung) {
          row.push(
            `${zuweisung.user.nachname}, ${zuweisung.user.vorname}`
          );
        } else {
          row.push("\u2014");
        }
      }
      body.push(row);
    }

    // Sonderfunktionen als letzte Zeile
    if (dienstplan) {
      const sonderfkt = dienstplan.zuweisungen.filter(
        (z) => z.sonderfunktion
      );
      if (sonderfkt.length > 0) {
        const sfText = sonderfkt
          .map(
            (z) =>
              `${z.sonderfunktion!.name}: ${z.user.nachname}`
          )
          .join(" | ");
        body.push(["Sonderfkt.", sfText, ...Array(Math.max(0, shownFahrzeuge.length - 1)).fill("")]);
      }
    }

    autoTable(doc, {
      startY,
      head,
      body,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY + 8;
  }

  // Tagschicht
  yPos = renderSchichtTabelle(
    "Tagschicht",
    getSchichtZeitraum("TAG", schichtZeiten),
    "TAG",
    tag,
    yPos
  );

  // Nachtschicht
  renderSchichtTabelle(
    "Nachtschicht",
    getSchichtZeitraum("NACHT", schichtZeiten),
    "NACHT",
    nacht,
    yPos
  );

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
    14,
    pageHeight - 8
  );

  // Download
  doc.save(`Dienstplan_WA${abteilungName}_${datum}.pdf`);
}
