"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Sun, Moon, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// 0 = Montag ... 6 = Sonntag
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const SCHICHTEN = ["TAG", "NACHT"] as const;
type Schicht = (typeof SCHICHTEN)[number];

type Grid = Record<Schicht, boolean[]>; // je 7 Eintraege (Mo-So)

interface FahrzeugDienstzeitDTO {
  id: string;
  name: string;
  typ: string;
  aktiv: boolean;
  reihenfolge: number;
  dienstzeiten: { wochentag: number; schicht: Schicht; imDienst: boolean }[];
}

function leeresGrid(): Grid {
  // Default: ueberall im Dienst (wie bisher), bis etwas anderes gesetzt wird
  return {
    TAG: Array(7).fill(true),
    NACHT: Array(7).fill(true),
  };
}

function gridAusDaten(dz: FahrzeugDienstzeitDTO["dienstzeiten"]): Grid {
  const grid = leeresGrid();
  for (const e of dz) {
    if (e.wochentag >= 0 && e.wochentag <= 6) {
      grid[e.schicht][e.wochentag] = e.imDienst;
    }
  }
  return grid;
}

export function FahrzeugDienstzeiten() {
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugDienstzeitDTO[]>([]);
  const [grids, setGrids] = useState<Record<string, Grid>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fahrzeuge/dienstzeiten");
      if (!res.ok) throw new Error("Dienstzeiten konnten nicht geladen werden");
      const data: FahrzeugDienstzeitDTO[] = await res.json();
      setFahrzeuge(data);
      const g: Record<string, Grid> = {};
      for (const f of data) g[f.id] = gridAusDaten(f.dienstzeiten);
      setGrids(g);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function setGrid(fahrzeugId: string, updater: (g: Grid) => Grid) {
    setGrids((prev) => ({ ...prev, [fahrzeugId]: updater(prev[fahrzeugId]) }));
  }

  function toggleZelle(fahrzeugId: string, schicht: Schicht, tag: number) {
    setGrid(fahrzeugId, (g) => {
      const next: Grid = { TAG: [...g.TAG], NACHT: [...g.NACHT] };
      next[schicht][tag] = !next[schicht][tag];
      return next;
    });
  }

  // Klick auf Wochentag-Kopf: 24h fuer den Tag an/aus (beide Schichten)
  function toggleTag24h(fahrzeugId: string, tag: number) {
    setGrid(fahrzeugId, (g) => {
      const beideAn = g.TAG[tag] && g.NACHT[tag];
      const next: Grid = { TAG: [...g.TAG], NACHT: [...g.NACHT] };
      next.TAG[tag] = !beideAn;
      next.NACHT[tag] = !beideAn;
      return next;
    });
  }

  function setAlle(fahrzeugId: string, wert: boolean) {
    setGrid(fahrzeugId, () => ({
      TAG: Array(7).fill(wert),
      NACHT: Array(7).fill(wert),
    }));
  }

  async function handleSave(fahrzeugId: string) {
    const grid = grids[fahrzeugId];
    if (!grid) return;
    setSavingId(fahrzeugId);
    try {
      const eintraege = SCHICHTEN.flatMap((schicht) =>
        grid[schicht].map((imDienst, wochentag) => ({
          wochentag,
          schicht,
          imDienst,
        }))
      );
      const res = await fetch("/api/fahrzeuge/dienstzeiten", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fahrzeugId, eintraege }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }
      toast.success("Dienstzeiten gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fahrzeuge.map((f) => {
        const grid = grids[f.id] ?? leeresGrid();
        return (
          <Card key={f.id}>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{f.name}</CardTitle>
                  <CardDescription>{f.typ}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAlle(f.id, true)}
                  >
                    <Clock className="size-3.5" />
                    24h alle Tage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAlle(f.id, false)}
                  >
                    Alle frei
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave(f.id)}
                    disabled={savingId === f.id}
                  >
                    {savingId === f.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Speichern
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-separate border-spacing-1 text-center text-sm">
                  <thead>
                    <tr>
                      <th className="w-16" />
                      {WOCHENTAGE.map((wt, i) => (
                        <th key={wt} className="px-1">
                          <button
                            type="button"
                            onClick={() => toggleTag24h(f.id, i)}
                            title="24h fuer diesen Tag umschalten"
                            className="w-full rounded px-1 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            {wt}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCHICHTEN.map((schicht) => (
                      <tr key={schicht}>
                        <td className="pr-1 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            {schicht === "TAG" ? (
                              <Sun className="size-3.5 text-amber-500" />
                            ) : (
                              <Moon className="size-3.5 text-indigo-500" />
                            )}
                            {schicht === "TAG" ? "Tag" : "Nacht"}
                          </span>
                        </td>
                        {grid[schicht].map((imDienst, tag) => (
                          <td key={tag}>
                            <button
                              type="button"
                              onClick={() => toggleZelle(f.id, schicht, tag)}
                              className={`h-9 w-full rounded-md border text-xs font-medium transition-colors ${
                                imDienst
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "border-slate-200 bg-slate-50 text-slate-300 hover:bg-slate-100"
                              }`}
                              aria-pressed={imDienst}
                            >
                              {imDienst ? "✓" : "–"}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Grün = im Dienst. Klick auf einen Wochentag (Mo–So) schaltet 24h
                (Tag + Nacht) für diesen Tag um.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
