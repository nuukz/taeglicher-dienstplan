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

interface PersonalUser {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  rolle: "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER";
  aktiv: boolean;
  abteilungId: string;
  abteilung: Abteilung;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  vorname: string;
  nachname: string;
  email: string;
  passwort: string;
  rolle: "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER";
  abteilungId: string;
}

const emptyForm: FormData = {
  vorname: "",
  nachname: "",
  email: "",
  passwort: "",
  rolle: "KOLLEGE",
  beschaeftigung: "BEAMTER",
  abteilungId: "",
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function PersonalPage() {
  const [users, setUsers] = useState<PersonalUser[]>([]);
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
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
      const [usersRes, abtRes] = await Promise.all([
        fetch("/api/personal"),
        fetch("/api/abteilungen"),
      ]);

      if (!usersRes.ok) throw new Error("Personal konnte nicht geladen werden");
      if (!abtRes.ok) throw new Error("Abteilungen konnten nicht geladen werden");

      const [usersData, abtData] = await Promise.all([
        usersRes.json(),
        abtRes.json(),
      ]);

      setUsers(usersData);
      setAbteilungen(abtData);
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
    setEditingUser(null);
    setForm({
      ...emptyForm,
      abteilungId: abteilungen[0]?.id ?? "",
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
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingUser) {
        // PATCH – update
        const body: Record<string, unknown> = {
          vorname: form.vorname,
          nachname: form.nachname,
          email: form.email,
          rolle: form.rolle,
          beschaeftigung: form.beschaeftigung,
          abteilungId: form.abteilungId,
        };
        if (form.passwort) {
          body.passwort = form.passwort;
        }

        const res = await fetch(`/api/personal/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }

        toast.success(`${form.vorname} ${form.nachname} aktualisiert`);
      } else {
        // POST – create
        if (!form.passwort) {
          toast.error("Passwort ist bei Neuanlage erforderlich");
          setSaving(false);
          return;
        }

        const res = await fetch("/api/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }

        toast.success(`${form.vorname} ${form.nachname} angelegt`);
      }

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
  // Filtered users
  // ----------------------------------------------------------

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
                {/* Vorname + Nachname */}
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

                {/* E-Mail */}
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

                {/* Passwort */}
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

                {/* Rolle */}
                <div className="space-y-1.5">
                  <Label>Rolle</Label>
                  <Select
                    value={form.rolle}
                    onValueChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        rolle: val as "ADMIN" | "KOLLEGE",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Rolle wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KOLLEGE">Kollege</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Beschäftigung */}
                <div className="space-y-1.5">
                  <Label>Beschäftigung</Label>
                  <Select
                    value={form.beschaeftigung}
                    onValueChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        beschaeftigung: val as "BEAMTER" | "ANGESTELLTER",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Beschäftigung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEAMTER">Beamter</SelectItem>
                      <SelectItem value="ANGESTELLTER">Angestellter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Abteilung */}
                <div className="space-y-1.5">
                  <Label>Wachabteilung</Label>
                  <Select
                    value={form.abteilungId}
                    onValueChange={(val) =>
                      setForm((f) => ({ ...f, abteilungId: val as string }))
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
        onValueChange={(val) => setFilterAbteilung(val as string)}
      >
        <TabsList>
          <TabsTrigger value="alle">
            Alle ({users.length})
          </TabsTrigger>
          {abteilungen.map((abt) => {
            const count = users.filter((u) => u.abteilungId === abt.id).length;
            return (
              <TabsTrigger key={abt.id} value={abt.id}>
                {abt.name} ({count})
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
              <TableHead className="hidden sm:table-cell">E-Mail</TableHead>
              <TableHead>Wachabteilung</TableHead>
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
              filteredUsers.map((user) => (
                <TableRow key={user.id} className={!user.aktiv ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    {user.vorname} {user.nachname}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-500">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.abteilung.name}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant={user.rolle === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.rolle === "ADMIN" ? "Admin" : "Kollege"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">
                      {user.beschaeftigung === "BEAMTER"
                        ? "Beamter"
                        : "Angestellter"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.aktiv ? (
                      <Badge
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile info cards (visible below sm breakpoint as supplement) */}
      <div className="space-y-3 sm:hidden">
        {filteredUsers.map((user) => (
          <div
            key={`mobile-${user.id}`}
            className={`rounded-lg border bg-white p-4 ${!user.aktiv ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {user.vorname} {user.nachname}
                </p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="flex gap-1">
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
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline">{user.abteilung.name}</Badge>
              <Badge
                variant={user.rolle === "ADMIN" ? "default" : "secondary"}
              >
                {user.rolle === "ADMIN" ? "Admin" : "Kollege"}
              </Badge>
              <Badge variant="outline">
                {user.beschaeftigung === "BEAMTER" ? "Beamter" : "Angestellter"}
              </Badge>
              {user.aktiv ? (
                <Badge className="bg-emerald-100 text-emerald-700">Aktiv</Badge>
              ) : (
                <Badge variant="secondary">Inaktiv</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
