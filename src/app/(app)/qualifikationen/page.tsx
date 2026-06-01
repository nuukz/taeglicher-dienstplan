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
  Award,
} from "lucide-react";
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

interface Qualifikation {
  id: string;
  kuerzel: string;
  name: string;
  farbe: string;
  _count: {
    users: number;
  };
}

interface QualifikationFormData {
  kuerzel: string;
  name: string;
  farbe: string;
}

const emptyForm: QualifikationFormData = {
  kuerzel: "",
  name: "",
  farbe: "#6b7280",
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function QualifikationenPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [qualifikationen, setQualifikationen] = useState<Qualifikation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuali, setEditingQuali] = useState<Qualifikation | null>(null);
  const [form, setForm] = useState<QualifikationFormData>(emptyForm);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQuali, setDeletingQuali] = useState<Qualifikation | null>(null);

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
      const res = await fetch("/api/qualifikationen");
      if (!res.ok) throw new Error("Qualifikationen konnten nicht geladen werden");
      const data = await res.json();
      setQualifikationen(data);
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
    setEditingQuali(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(quali: Qualifikation) {
    setEditingQuali(quali);
    setForm({
      kuerzel: quali.kuerzel,
      name: quali.name,
      farbe: quali.farbe,
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(quali: Qualifikation) {
    setDeletingQuali(quali);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingQuali) {
        const res = await fetch(`/api/qualifikationen/${editingQuali.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }

        toast.success(`"${form.kuerzel}" aktualisiert`);
      } else {
        const res = await fetch("/api/qualifikationen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        toast.success(`"${form.kuerzel}" angelegt`);
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
    if (!deletingQuali) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/qualifikationen/${deletingQuali.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      toast.success(`"${deletingQuali.kuerzel}" gelöscht`);
      setDeleteDialogOpen(false);
      setDeletingQuali(null);
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
          <h1 className="text-2xl font-bold text-slate-900">Qualifikationen</h1>
          <p className="text-sm text-slate-500">
            {qualifikationen.length} Qualifikationen
          </p>
        </div>

        {/* Neue Qualifikation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Neue Qualifikation
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingQuali ? "Qualifikation bearbeiten" : "Neue Qualifikation"}
                </DialogTitle>
                <DialogDescription>
                  {editingQuali
                    ? "Qualifikation anpassen."
                    : "Neue Qualifikation im System anlegen."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="q-kuerzel">Kürzel</Label>
                  <Input
                    id="q-kuerzel"
                    required
                    value={form.kuerzel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, kuerzel: e.target.value }))
                    }
                    placeholder="z.B. TF, GF, NotSan"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-name">Name</Label>
                  <Input
                    id="q-name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="z.B. Truppführer"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-farbe">Farbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="q-farbe"
                      type="color"
                      value={form.farbe}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, farbe: e.target.value }))
                      }
                      className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                    />
                    <Badge
                      style={{ backgroundColor: form.farbe, color: "#fff" }}
                    >
                      {form.kuerzel || "Vorschau"}
                    </Badge>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingQuali ? "Speichern" : "Anlegen"}
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
            <DialogTitle>Qualifikation löschen?</DialogTitle>
            <DialogDescription>
              &quot;{deletingQuali?.kuerzel}&quot; ({deletingQuali?.name}) wirklich löschen?
              Alle User-Zuordnungen werden ebenfalls entfernt.
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
      {qualifikationen.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-white text-slate-400">
          <Award className="mb-2 size-8" />
          <p>Noch keine Qualifikationen angelegt.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kürzel</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Farbe</TableHead>
                <TableHead className="text-center">User</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {qualifikationen.map((quali) => (
                <TableRow key={quali.id}>
                  <TableCell>
                    <Badge
                      style={{ backgroundColor: quali.farbe, color: "#fff" }}
                    >
                      {quali.kuerzel}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{quali.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-4 rounded border border-slate-200"
                        style={{ backgroundColor: quali.farbe }}
                      />
                      <span className="text-xs text-slate-500">{quali.farbe}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {quali._count?.users ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(quali)}
                        title="Bearbeiten"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDeleteDialog(quali)}
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
