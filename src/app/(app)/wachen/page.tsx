"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Abteilung {
  id: string;
  name: string;
  _count: {
    users: number;
    dienstplaene: number;
  };
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function WachenPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAbteilung, setEditingAbteilung] = useState<Abteilung | null>(null);
  const [formName, setFormName] = useState("");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAbteilung, setDeletingAbteilung] = useState<Abteilung | null>(null);

  // SYSOP-only check
  useEffect(() => {
    if (session && session.user?.rolle !== "SYSOP") {
      router.replace("/dienstplan");
    }
  }, [session, router]);

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/abteilungen");
      if (!res.ok) throw new Error("Wachen konnten nicht geladen werden");
      const data = await res.json();
      setAbteilungen(data);
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
    setEditingAbteilung(null);
    setFormName("");
    setDialogOpen(true);
  }

  function openEditDialog(abteilung: Abteilung) {
    setEditingAbteilung(abteilung);
    setFormName(abteilung.name);
    setDialogOpen(true);
  }

  function openDeleteDialog(abteilung: Abteilung) {
    setDeletingAbteilung(abteilung);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingAbteilung) {
        const res = await fetch(`/api/abteilungen/${editingAbteilung.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }

        toast.success(`Wache "${formName}" aktualisiert`);
      } else {
        const res = await fetch("/api/abteilungen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        toast.success(`Wache "${formName}" angelegt`);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingAbteilung) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/abteilungen/${deletingAbteilung.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      toast.success(`Wache "${deletingAbteilung.name}" gelöscht`);
      setDeleteDialogOpen(false);
      setDeletingAbteilung(null);
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

  if (session?.user?.rolle !== "SYSOP") {
    return null;
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Wachen</h1>
          <p className="text-sm text-slate-500">
            {abteilungen.length} Wachabteilungen
          </p>
        </div>

        {/* Neue Wache Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Neue Wache
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingAbteilung ? "Wache bearbeiten" : "Neue Wache"}
                </DialogTitle>
                <DialogDescription>
                  {editingAbteilung
                    ? "Name der Wachabteilung ändern."
                    : "Neue Wachabteilung im System anlegen."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="wa-name">Name</Label>
                <Input
                  id="wa-name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="z.B. 4"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingAbteilung ? "Speichern" : "Anlegen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Wache löschen?</DialogTitle>
            <DialogDescription>
              Wache &quot;{deletingAbteilung?.name}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabelle */}
      {abteilungen.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-white text-slate-400">
          <Building2 className="mb-2 size-8" />
          <p>Noch keine Wachen angelegt.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">User</TableHead>
                <TableHead className="text-center">Dienstpläne</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {abteilungen.map((abt) => (
                <TableRow key={abt.id}>
                  <TableCell className="font-medium">WA {abt.name}</TableCell>
                  <TableCell className="text-center">
                    {abt._count?.users ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {abt._count?.dienstplaene ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(abt)}
                        title="Bearbeiten"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDeleteDialog(abt)}
                        title="Löschen"
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
