"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  X,
  Power,
  PowerOff,
  Loader2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface FahrzeugPosition {
  id: string;
  name: string;
  reihenfolge: number;
  fahrzeugId: string;
}

interface Fahrzeug {
  id: string;
  name: string;
  typ: string;
  aktiv: boolean;
  reihenfolge: number;
  positionen: FahrzeugPosition[];
}

interface FahrzeugFormData {
  name: string;
  typ: string;
  reihenfolge: number;
  anzahlPlaetze: number;
}

const emptyFahrzeugForm: FahrzeugFormData = {
  name: "",
  typ: "",
  reihenfolge: 0,
  anzahlPlaetze: 2,
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function FahrzeugePage() {
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fahrzeug dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFahrzeug, setEditingFahrzeug] = useState<Fahrzeug | null>(null);
  const [form, setForm] = useState<FahrzeugFormData>(emptyFahrzeugForm);

  // Position dialog
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posDialogFahrzeugId, setPosDialogFahrzeugId] = useState<string | null>(
    null
  );
  const [posName, setPosName] = useState("");

  // Position-Löschen-Bestätigung
  const [posDeleteTarget, setPosDeleteTarget] = useState<{
    fahrzeugId: string;
    position: FahrzeugPosition;
  } | null>(null);
  const [deletingPos, setDeletingPos] = useState(false);

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fahrzeuge");
      if (!res.ok) throw new Error("Fahrzeuge konnten nicht geladen werden");
      const data = await res.json();
      setFahrzeuge(data);
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
  // Fahrzeug handlers
  // ----------------------------------------------------------

  function openCreateDialog() {
    setEditingFahrzeug(null);
    setForm({
      ...emptyFahrzeugForm,
      reihenfolge: fahrzeuge.length > 0
        ? Math.max(...fahrzeuge.map((f) => f.reihenfolge)) + 1
        : 0,
    });
    setDialogOpen(true);
  }

  function openEditDialog(fahrzeug: Fahrzeug) {
    setEditingFahrzeug(fahrzeug);
    setForm({
      name: fahrzeug.name,
      typ: fahrzeug.typ,
      reihenfolge: fahrzeug.reihenfolge,
      anzahlPlaetze: 0,
    });
    setDialogOpen(true);
  }

  async function handleSubmitFahrzeug(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingFahrzeug) {
        const res = await fetch(`/api/fahrzeuge/${editingFahrzeug.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }

        toast.success(`${form.name} aktualisiert`);
      } else {
        const res = await fetch("/api/fahrzeuge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        toast.success(`${form.name} angelegt`);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAktiv(fahrzeug: Fahrzeug) {
    const newAktiv = !fahrzeug.aktiv;
    try {
      const res = await fetch(`/api/fahrzeuge/${fahrzeug.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: newAktiv }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Statuswechsel");
      }

      toast.success(
        `${fahrzeug.name} ${newAktiv ? "aktiviert" : "deaktiviert"}`
      );
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  // ----------------------------------------------------------
  // Position handlers
  // ----------------------------------------------------------

  function openAddPositionDialog(fahrzeugId: string) {
    setPosDialogFahrzeugId(fahrzeugId);
    setPosName("");
    setPosDialogOpen(true);
  }

  async function handleAddPosition(e: React.FormEvent) {
    e.preventDefault();
    if (!posDialogFahrzeugId || !posName.trim()) return;
    setSaving(true);

    try {
      const fahrzeug = fahrzeuge.find((f) => f.id === posDialogFahrzeugId);
      const nextOrder = fahrzeug
        ? Math.max(0, ...fahrzeug.positionen.map((p) => p.reihenfolge)) + 1
        : 0;

      const res = await fetch(
        `/api/fahrzeuge/${posDialogFahrzeugId}/positionen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: posName.trim(),
            reihenfolge: nextOrder,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Erstellen der Position");
      }

      toast.success(`Position "${posName.trim()}" hinzugefügt`);
      setPosDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePosition() {
    if (!posDeleteTarget) return;
    setDeletingPos(true);
    try {
      const res = await fetch(
        `/api/fahrzeuge/${posDeleteTarget.fahrzeugId}/positionen`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionId: posDeleteTarget.position.id }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Löschen der Position");
      }

      const data = await res.json();
      const entfernt = data.removedZuweisungen ?? 0;
      toast.success(
        entfernt > 0
          ? `Position entfernt (${entfernt} Einteilung${entfernt === 1 ? "" : "en"} gelöscht)`
          : "Position entfernt"
      );
      setPosDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setDeletingPos(false);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fahrzeuge</h1>
          <p className="text-sm text-slate-500">
            {fahrzeuge.length} Fahrzeuge insgesamt
          </p>
        </div>

        {/* Neues Fahrzeug Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Neues Fahrzeug
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmitFahrzeug}>
              <DialogHeader>
                <DialogTitle>
                  {editingFahrzeug
                    ? "Fahrzeug bearbeiten"
                    : "Neues Fahrzeug"}
                </DialogTitle>
                <DialogDescription>
                  {editingFahrzeug
                    ? "Daten des Fahrzeugs anpassen."
                    : "Neues Fahrzeug im System anlegen."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fz-name">Fahrzeugname</Label>
                  <Input
                    id="fz-name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="z.B. HLF, DL, ELW"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fz-typ">Fahrzeugtyp</Label>
                  <Input
                    id="fz-typ"
                    required
                    value={form.typ}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, typ: e.target.value }))
                    }
                    placeholder="z.B. Löschfahrzeug, Drehleiter"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fz-reihenfolge">Reihenfolge</Label>
                  <Input
                    id="fz-reihenfolge"
                    type="number"
                    required
                    value={form.reihenfolge}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reihenfolge: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                {!editingFahrzeug && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fz-plaetze">Anzahl Plätze (Besatzung)</Label>
                    <Input
                      id="fz-plaetze"
                      type="number"
                      min={0}
                      max={20}
                      value={form.anzahlPlaetze}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          anzahlPlaetze: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-slate-400">
                      Legt automatisch so viele Plätze an (Platz 1, Platz 2 …).
                      Namen kannst du danach noch ändern.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingFahrzeug ? "Speichern" : "Anlegen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Position hinzufuegen Dialog */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleAddPosition}>
            <DialogHeader>
              <DialogTitle>Position hinzufügen</DialogTitle>
              <DialogDescription>
                Neue Besatzungsposition für dieses Fahrzeug anlegen.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="pos-name">Positionsname</Label>
              <Input
                id="pos-name"
                required
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
                placeholder="z.B. Maschinist, Angriffstrupp"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" disabled={saving || !posName.trim()}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Hinzufügen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fahrzeug Cards Grid */}
      {fahrzeuge.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-white text-slate-400">
          <Truck className="mb-2 size-8" />
          <p>Noch keine Fahrzeuge angelegt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fahrzeuge.map((fahrzeug) => (
            <Card
              key={fahrzeug.id}
              className={!fahrzeug.aktiv ? "opacity-50" : ""}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{fahrzeug.name}</CardTitle>
                  {fahrzeug.aktiv ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inaktiv</Badge>
                  )}
                </div>

                <CardAction>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(fahrzeug)}
                      title="Bearbeiten"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant={fahrzeug.aktiv ? "destructive" : "ghost"}
                      size="icon-sm"
                      onClick={() => handleToggleAktiv(fahrzeug)}
                      title={
                        fahrzeug.aktiv ? "Deaktivieren" : "Aktivieren"
                      }
                    >
                      {fahrzeug.aktiv ? (
                        <PowerOff className="size-3.5" />
                      ) : (
                        <Power className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </CardAction>

                <p className="text-sm text-muted-foreground">
                  {fahrzeug.typ}
                </p>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Positionen ({fahrzeug.positionen.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => openAddPositionDialog(fahrzeug.id)}
                    >
                      <Plus className="size-3" />
                      Hinzufügen
                    </Button>
                  </div>

                  {fahrzeug.positionen.length === 0 ? (
                    <p className="py-2 text-center text-xs text-slate-400">
                      Keine Positionen definiert.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {fahrzeug.positionen.map((pos) => (
                        <li
                          key={pos.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-sm text-slate-700">
                            {pos.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              setPosDeleteTarget({
                                fahrzeugId: fahrzeug.id,
                                position: pos,
                              })
                            }
                            title="Position entfernen"
                          >
                            <X className="size-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Position-Löschen-Bestätigung */}
      <Dialog
        open={posDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPosDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Position löschen?</DialogTitle>
            <DialogDescription>
              Die Position „{posDeleteTarget?.position.name}“ wird endgültig
              gelöscht. Falls sie in Dienstplänen bereits eingeteilt ist, werden
              diese Einteilungen mit entfernt. Das kann nicht rückgängig gemacht
              werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setPosDeleteTarget(null)}
              disabled={deletingPos}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePosition}
              disabled={deletingPos}
            >
              {deletingPos && <Loader2 className="size-4 animate-spin" />}
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
