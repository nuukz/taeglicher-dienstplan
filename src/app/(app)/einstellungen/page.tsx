"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Sun, Moon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { FahrzeugDienstzeiten } from "@/components/einstellungen/fahrzeug-dienstzeiten";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface SchichtKonfiguration {
  id: string;
  schicht: "TAG" | "NACHT";
  startZeit: string;
  endZeit: string;
}

interface SchichtForm {
  startZeit: string;
  endZeit: string;
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function EinstellungenPage() {
  const [_konfigurationen, setKonfigurationen] = useState<
    SchichtKonfiguration[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Per-shift form state
  const [tagForm, setTagForm] = useState<SchichtForm>({
    startZeit: "07:00",
    endZeit: "19:00",
  });
  const [nachtForm, setNachtForm] = useState<SchichtForm>({
    startZeit: "19:00",
    endZeit: "07:00",
  });

  const [savingTag, setSavingTag] = useState(false);
  const [savingNacht, setSavingNacht] = useState(false);

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/einstellungen");
      if (!res.ok)
        throw new Error("Einstellungen konnten nicht geladen werden");
      const data: SchichtKonfiguration[] = await res.json();
      setKonfigurationen(data);

      // Populate forms from fetched data
      const tagKonfig = data.find((k) => k.schicht === "TAG");
      const nachtKonfig = data.find((k) => k.schicht === "NACHT");

      if (tagKonfig) {
        setTagForm({
          startZeit: tagKonfig.startZeit,
          endZeit: tagKonfig.endZeit,
        });
      }

      if (nachtKonfig) {
        setNachtForm({
          startZeit: nachtKonfig.startZeit,
          endZeit: nachtKonfig.endZeit,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----------------------------------------------------------
  // Save handler
  // ----------------------------------------------------------

  async function handleSave(schicht: "TAG" | "NACHT") {
    const form = schicht === "TAG" ? tagForm : nachtForm;
    const setSaving = schicht === "TAG" ? setSavingTag : setSavingNacht;

    setSaving(true);

    try {
      const res = await fetch("/api/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schicht,
          startZeit: form.startZeit,
          endZeit: form.endZeit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }

      toast.success(
        `${schicht === "TAG" ? "Tagschicht" : "Nachtschicht"} gespeichert`
      );
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500">
          Schichtzeiten und Fahrzeug-Dienstzeiten konfigurieren.
        </p>
      </div>

      {/* Schicht Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tagschicht */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="size-5 text-amber-500" />
              <CardTitle>Tagschicht</CardTitle>
            </div>
            <CardDescription>
              Beginn und Ende der Tagschicht festlegen.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tag-start">Beginn</Label>
                <Input
                  id="tag-start"
                  type="time"
                  value={tagForm.startZeit}
                  onChange={(e) =>
                    setTagForm((f) => ({
                      ...f,
                      startZeit: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tag-end">Ende</Label>
                <Input
                  id="tag-end"
                  type="time"
                  value={tagForm.endZeit}
                  onChange={(e) =>
                    setTagForm((f) => ({
                      ...f,
                      endZeit: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={() => handleSave("TAG")}
              disabled={savingTag}
            >
              {savingTag ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Speichern
            </Button>
          </CardFooter>
        </Card>

        {/* Nachtschicht */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="size-5 text-indigo-500" />
              <CardTitle>Nachtschicht</CardTitle>
            </div>
            <CardDescription>
              Beginn und Ende der Nachtschicht festlegen.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nacht-start">Beginn</Label>
                <Input
                  id="nacht-start"
                  type="time"
                  value={nachtForm.startZeit}
                  onChange={(e) =>
                    setNachtForm((f) => ({
                      ...f,
                      startZeit: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nacht-end">Ende</Label>
                <Input
                  id="nacht-end"
                  type="time"
                  value={nachtForm.endZeit}
                  onChange={(e) =>
                    setNachtForm((f) => ({
                      ...f,
                      endZeit: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={() => handleSave("NACHT")}
              disabled={savingNacht}
            >
              {savingNacht ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Speichern
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Fahrzeug-Dienstzeiten */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Fahrzeug-Dienstzeiten
        </h2>
        <p className="text-sm text-slate-500">
          Festlegen, wann ein Fahrzeug normalerweise im Dienst ist (pro Wochentag
          und Schicht). Nicht im Dienst stehende Fahrzeuge werden beim Anlegen
          eines Dienstplans automatisch als inaktiv vorbelegt.
        </p>
      </div>
      <FahrzeugDienstzeiten />
    </div>
  );
}
