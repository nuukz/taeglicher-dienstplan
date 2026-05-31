"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, UserX, UserCheck, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface Abteilung {
  id: string;
  name: string;
}

interface QualifikationData {
  id: string;
  kuerzel: string;
  name: string;
  farbe: string;
}

interface PersonalUser {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER" | "AZUBI";
  aktiv: boolean;
  abteilungId: string;
  abteilung: Abteilung;
  qualifikationen?: { qualifikation: QualifikationData }[];
}

interface FormData {
  vorname: string;
  nachname: string;
  email: string;
  passwort: string;
  rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER" | "AZUBI";
  abteilungId: string;
  qualifikationIds: string[];
}

const emptyForm: FormData = {
  vorname: "",
  nachname: "",
  email: "",
  passwort: "",
  rolle: "KOLLEGE",
  beschaeftigung: "BEAMTER",
  abteilungId: "",
  qualifikationIds: [],
};

const ROLE_LABELS: Record<string, string> = {
  SYSOP: "Sysop",
  ADMIN: "Admin",
  KOLLEGE: "Kollege",
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function PersonalPage() {
  const [users, setUsers] = useState<PersonalUser[]>([]);
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [alleQualis, setAlleQualis] = useState<QualifikationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PersonalUser | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // Filter
  const [filterAbteilung, setFilterAbteilung] = useState<string>("alle");

  // ----------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, abtRes, qualiRes] = await Promise.all([
        fetch("/api/personal"),
        fetch("/api/abteilungen"),
        fetch("/api/qualifikationen"),
      ]);

      if (!usersRes.ok) throw new Error("Personal konnte nicht geladen werden");
      if (!abtRes.ok) throw new Error("Abteilungen konnten nicht geladen werden");

      const [usersData, abtData, qualiData] = await Promise.all([
        usersRes.json(),
        abtRes.json(),
        qualiRes.ok ? qualiRes.json() : [],
      ]);

      setUsers(usersData);
      setAbteilungen(abtData);
      setAlleQualis(qualiData);
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
  // Edit Dialog Handlers
  // ----------------------------------------------------------

  function openCreateDialog() {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      abteilungId: abteilungen[0]?.id ?? "",
      qualifikationIds: [],
    });
    setDialogOpen(true);
  }

  function openEditDialog(user: PersonalUser) {
    setEditingUser(user);
    setForm({
      vorname: user.vorname,
      nachname: user.nachname,
      email: user.email,
      passwort: "",
      rolle: user.rolle,
      beschaeftigung: user.beschaeftigung,
      abteilungId: user.abteilungId,
      qualifikationIds: (user.qualifikationen || []).map((q) => q.qualifikation.id),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let userId: string;

      if (editingUser) {
        userId = editingUser.id;
        const body: Record<string, unknown> = {
          vorname: form.vorname,
          nachname: form.nachname,
          email: form.email,
          rolle: form.rolle,
          beschaeftigung: form.beschaeftigung,
          abteilungId: form.abteilungId,
        };
        if (form.passwort) body.passwort = form.passwort;

        const res = await fetch(`/api/personal/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }
      } else {
        if (!form.passwort) {
          toast.error("Passwort ist bei Neuanlage erforderlich");
          setSaving(false);
          return;
        }

        const { qualifikationIds: _, ...createData } = form;
        const res = await fetch("/api/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        const created = await res.json();
        userId = created.id;
      }

      // Qualifikationen speichern
      const qualiRes = await fetch(`/api/personal/${userId}/qualifikationen`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualifikationIds: form.qualifikationIds }),
      });

      if (!qualiRes.ok) {
        const data = await qualiRes.json();
        throw new Error(data.error || "Fehler beim Speichern der Qualifikationen");
      }

      toast.success(
        editingUser
          ? `${form.vorname} ${form.nachname} aktualisiert`
          : `${form.vorname} ${form.nachname} angelegt`
      );
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAktiv(user: PersonalUser) {
    const newAktiv = !user.aktiv;
    try {
      const res = await fetch(`/api/personal/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: newAktiv }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Statuswechsel");
      }

      toast.success(
        `${user.vorname} ${user.nachname} ${newAktiv ? "aktiviert" : "deaktiviert"}`
      );
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  function toggleFormQuali(qualiId: string) {
    setForm((f) => ({
      ...f,
      qualifikationIds: f.qualifikationIds.includes(qualiId)
        ? f.qualifikationIds.filter((id) => id !== qualiId)
        : [...f.qualifikationIds, qualiId],
    }));
  }

  function getUserQualis(user: PersonalUser): QualifikationData[] {
    return (user.qualifikationen || []).map((q) => q.qualifikation);
  }

  const filteredUsers =
    filterAbteilung === "alle"
      ? users
      : users.filter((u) => u.abteilungId === filterAbteilung);

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
          <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
          <p className="text-sm text-slate-500">
            {users.length} Kollegen insgesamt
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Neuer Kollege
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Kollege bearbeiten" : "Neuer Kollege"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Daten des Kollegen anpassen."
                    : "Neuen Kollegen im System anlegen."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vorname">Vorname</Label>
                    <Input
                      id="vorname"
                      required
                      value={form.vorname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, vorname: e.target.value }))
                      }
                      placeholder="Max"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nachname">Nachname</Label>
                    <Input
                      id="nachname"
                      required
                      value={form.nachname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nachname: e.target.value }))
                      }
                      placeholder="Mustermann"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="max@feuerwehr.de"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passwort">
                    Passwort{editingUser ? " (leer = unverändert)" : ""}
                  </Label>
                  <Input
                    id="passwort"
                    type="password"
                    required={!editingUser}
                    minLength={8}
                    value={form.passwort}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, passwort: e.target.value }))
                    }
                    placeholder={
                      editingUser ? "Nur bei Änderung ausfüllen" : "Min. 8 Zeichen"
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Rolle</Label>
                  <Select
                    value={form.rolle}
                    onValueChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        rolle: String(val) as FormData["rolle"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Rolle wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KOLLEGE">Kollege</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="SYSOP">System-Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Beschäftigung</Label>
                  <Select
                    value={form.beschaeftigung}
                    onValueChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        beschaeftigung: String(val) as "BEAMTER" | "ANGESTELLTER" | "AZUBI",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Beschäftigung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEAMTER">Beamter</SelectItem>
                      <SelectItem value="ANGESTELLTER">Angestellter</SelectItem>
                      <SelectItem value="AZUBI">Azubi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Wachabteilung</Label>
                  <Select
                    value={form.abteilungId}
                    onValueChange={(val) =>
                      setForm((f) => ({ ...f, abteilungId: String(val) }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wachabteilung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {abteilungen.map((abt) => (
                        <SelectItem key={abt.id} value={abt.id}>
                          Wachabteilung {abt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Qualifikationen */}
              {alleQualis.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block">Qualifikationen</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {alleQualis.map((q) => {
                      const isActive = form.qualifikationIds.includes(q.id);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => toggleFormQuali(q.id)}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                            isActive
                              ? "border-slate-400 bg-slate-50 font-medium"
                              : "border-slate-200 text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block size-3 rounded-sm shrink-0 ${isActive ? "" : "opacity-30"}`}
                            style={{ backgroundColor: q.farbe }}
                          />
                          <span className={isActive ? "text-slate-900" : "text-slate-400"}>
                            {q.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingUser ? "Speichern" : "Anlegen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={filterAbteilung}
        onValueChange={(val) => setFilterAbteilung(String(val))}
      >
        <TabsList>
          <TabsTrigger value="alle">
            Alle ({users.length})
          </TabsTrigger>
          {abteilungen.map((abt) => {
            const count = users.filter((u) => u.abteilungId === abt.id).length;
            return (
              <TabsTrigger key={abt.id} value={abt.id}>
                WA {abt.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Qualifikationen</TableHead>
              <TableHead>WA</TableHead>
              <TableHead className="hidden md:table-cell">Rolle</TableHead>
              <TableHead className="hidden md:table-cell">Beschäftigung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                  Keine Kollegen gefunden.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const qualis = getUserQualis(user);
                return (
                  <TableRow
                    key={user.id}
                    className={`cursor-pointer ${!user.aktiv ? "opacity-50" : ""}`}
                    onClick={() => openEditDialog(user)}
                  >
                    <TableCell className="font-medium">
                      {user.vorname} {user.nachname}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-0.5">
                        {qualis.slice(0, 5).map((q) => (
                          <span
                            key={q.id}
                            className="inline-block rounded px-1.5 py-0 text-[10px] font-medium text-white"
                            style={{ backgroundColor: q.farbe }}
                          >
                            {q.kuerzel}
                          </span>
                        ))}
                        {qualis.length > 5 && (
                          <span className="text-[10px] text-slate-400">
                            +{qualis.length - 5}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.abteilung.name}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={user.rolle === "KOLLEGE" ? "secondary" : "default"}
                      >
                        {ROLE_LABELS[user.rolle] || user.rolle}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {user.beschaeftigung === "BEAMTER" ? "Bmt." : user.beschaeftigung === "AZUBI" ? "Azubi" : "Ang."}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.aktiv ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(user)}
                          title="Bearbeiten"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant={user.aktiv ? "destructive" : "ghost"}
                          size="icon-sm"
                          onClick={() => handleToggleAktiv(user)}
                          title={user.aktiv ? "Deaktivieren" : "Aktivieren"}
                        >
                          {user.aktiv ? (
                            <UserX className="size-3.5" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile info cards */}
      <div className="space-y-3 sm:hidden">
        {filteredUsers.map((user) => {
          const qualis = getUserQualis(user);
          return (
            <div
              key={`mobile-${user.id}`}
              className={`rounded-lg border bg-white p-4 cursor-pointer ${!user.aktiv ? "opacity-50" : ""}`}
              onClick={() => openEditDialog(user)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {user.vorname} {user.nachname}
                  </p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEditDialog(user)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant={user.aktiv ? "destructive" : "ghost"}
                    size="icon-sm"
                    onClick={() => handleToggleAktiv(user)}
                  >
                    {user.aktiv ? (
                      <UserX className="size-3.5" />
                    ) : (
                      <UserCheck className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              {qualis.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-0.5">
                  {qualis.map((q) => (
                    <span
                      key={q.id}
                      className="inline-block rounded px-1.5 py-0 text-[10px] font-medium text-white"
                      style={{ backgroundColor: q.farbe }}
                    >
                      {q.kuerzel}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{user.abteilung.name}</Badge>
                <Badge variant={user.rolle === "KOLLEGE" ? "secondary" : "default"}>
                  {ROLE_LABELS[user.rolle] || user.rolle}
                </Badge>
                <Badge variant="outline">
                  {user.beschaeftigung === "BEAMTER" ? "Beamter" : user.beschaeftigung === "AZUBI" ? "Azubi" : "Angestellter"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
