"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Power, PowerOff, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Sonderfunktion {
  id: string;
  name: string;
  aktiv: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function SonderfunktionenPage() {
  const [sonderfunktionen, setSonderfunktionen] = useState<Sonderfunktion[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sonderfunktion | null>(null);
  const [formName, setFormName] = useState("");

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sonderfunktionen");
      if (!res.ok)
        throw new Error("Sonderfunktionen konnten nicht geladen werden");
      const data = await res.json();
      setSonderfunktionen(data);
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
  // Handlers
  // ----------------------------------------------------------

  function openCreateDialog() {
    setEditingItem(null);
    setFormName("");
    setDialogOpen(true);
  }

  function openEditDialog(item: Sonderfunktion) {
    setEditingItem(item);
    setFormName(item.name);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingItem) {
        const res = await fetch(`/api/sonderfunktionen/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }

        toast.success(`"${formName}" aktualisiert`);
      } else {
        const res = await fetch("/api/sonderfunktionen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        toast.success(`"${formName}" angelegt`);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAktiv(item: Sonderfunktion) {
    const newAktiv = !item.aktiv;
    try {
      const res = await fetch(`/api/sonderfunktionen/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: newAktiv }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Statuswechsel");
      }

      toast.success(
        `"${item.name}" ${newAktiv ? "aktiviert" : "deaktiviert"}`
      );
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
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
          <h1 className="text-2xl font-bold text-slate-900">
            Sonderfunktionen
          </h1>
          <p className="text-sm text-slate-500">
            {sonderfunktionen.length} Sonderfunktionen insgesamt
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Neue Sonderfunktion
          </DialogTrigger>

          <DialogContent className="sm:max-w-sm">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingItem
                    ? "Sonderfunktion bearbeiten"
                    : "Neue Sonderfunktion"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Namen der Sonderfunktion anpassen."
                    : "Neue Sonderfunktion im System anlegen."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="sf-name">Name</Label>
                <Input
                  id="sf-name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="z.B. Koch, Tagesdienst, Schirmmeister"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={saving || !formName.trim()}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingItem ? "Speichern" : "Anlegen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {sonderfunktionen.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-white text-slate-400">
          <Star className="mb-2 size-8" />
          <p>Noch keine Sonderfunktionen angelegt.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sonderfunktionen.map((item) => (
                <TableRow
                  key={item.id}
                  className={!item.aktiv ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {item.aktiv ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inaktiv</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(item)}
                        title="Bearbeiten"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant={item.aktiv ? "destructive" : "ghost"}
                        size="icon-sm"
                        onClick={() => handleToggleAktiv(item)}
                        title={item.aktiv ? "Deaktivieren" : "Aktivieren"}
                      >
                        {item.aktiv ? (
                          <PowerOff className="size-3.5" />
                        ) : (
                          <Power className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile cards (visible below sm breakpoint) */}
      <div className="space-y-3 sm:hidden">
        {sonderfunktionen.map((item) => (
          <div
            key={`mobile-${item.id}`}
            className={`rounded-lg border bg-white p-4 ${
              !item.aktiv ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{item.name}</span>
                {item.aktiv ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Aktiv
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inaktiv</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEditDialog(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant={item.aktiv ? "destructive" : "ghost"}
                  size="icon-sm"
                  onClick={() => handleToggleAktiv(item)}
                >
                  {item.aktiv ? (
                    <PowerOff className="size-3.5" />
                  ) : (
                    <Power className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
