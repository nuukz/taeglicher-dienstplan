"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  UserX,
  UserCheck,
  ChevronRight,
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  UserData,
  AbwesenheitData,
  QualifikationData,
} from "@/types/dienstplan";

const ABWESENHEITS_GRUENDE = [
  { value: "KRANK", label: "Krank", color: "bg-red-100 text-red-700" },
  { value: "URLAUB", label: "Urlaub", color: "bg-blue-100 text-blue-700" },
  { value: "FORTBILDUNG", label: "Fortbildung", color: "bg-purple-100 text-purple-700" },
  { value: "FREI", label: "Frei", color: "bg-slate-100 text-slate-700" },
  { value: "SONSTIGES", label: "Sonstiges", color: "bg-yellow-100 text-yellow-700" },
] as const;

function getGrundStyle(grund: string) {
  return ABWESENHEITS_GRUENDE.find((g) => g.value === grund) ?? ABWESENHEITS_GRUENDE[4];
}

interface VerfuegbarkeitEditorProps {
  personal: UserData[];
  abwesenheiten: AbwesenheitData[];
  datum: string; // "2026-05-29"
  abteilungId: string;
  qualifikationen: QualifikationData[];
  onAbwesenheitChanged: () => void;
  onVertretungAdded: () => void;
  onWeiter: () => void;
}

export function VerfuegbarkeitEditor({
  personal,
  abwesenheiten,
  datum,
  abteilungId,
  qualifikationen,
  onAbwesenheitChanged,
  onVertretungAdded,
  onWeiter,
}: VerfuegbarkeitEditorProps) {
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Tagesvertretung-Dialog
  const [vertretungOpen, setVertretungOpen] = useState(false);
  const [vVorname, setVVorname] = useState("");
  const [vNachname, setVNachname] = useState("");
  const [vQualis, setVQualis] = useState<string[]>([]);
  const [vSaving, setVSaving] = useState(false);

  function toggleVQuali(id: string) {
    setVQualis((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  }

  async function handleAddVertretung(e: React.FormEvent) {
    e.preventDefault();
    if (!vVorname.trim() || !vNachname.trim()) return;
    setVSaving(true);
    try {
      const res = await fetch("/api/personal/vertretung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vorname: vVorname.trim(),
          nachname: vNachname.trim(),
          datum,
          abteilungId,
          qualifikationIds: vQualis,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Anlegen");
      }
      toast.success("Vertretung hinzugefügt");
      setVertretungOpen(false);
      setVVorname("");
      setVNachname("");
      setVQualis([]);
      onVertretungAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setVSaving(false);
    }
  }

  async function handleRemoveVertretung(userId: string) {
    setSavingUserId(userId);
    try {
      const res = await fetch(`/api/personal/${userId}?hard=1`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Entfernen");
      }
      onVertretungAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingUserId(null);
    }
  }

  const abwesenheitMap = new Map<string, AbwesenheitData>();
  for (const a of abwesenheiten) {
    abwesenheitMap.set(a.userId, a);
  }

  const activePersonal = personal
    .filter((u) => u.aktiv)
    .sort((a, b) => a.nachname.localeCompare(b.nachname));

  const verfuegbar = activePersonal.filter((u) => !abwesenheitMap.has(u.id));

  async function handleSetAbwesend(userId: string, grund: string) {
    setSavingUserId(userId);
    try {
      const res = await fetch("/api/abwesenheit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, datum, grund }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler");
      }
      onAbwesenheitChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRemoveAbwesend(userId: string) {
    setSavingUserId(userId);
    try {
      const res = await fetch("/api/abwesenheit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, datum }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler");
      }
      onAbwesenheitChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Schritt 1: Verfuegbarkeit
          </h2>
          <p className="text-sm text-slate-500">
            Markiere wer heute nicht da ist
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-emerald-600">{verfuegbar.length}</span>
            {" "}von {activePersonal.length} verfuegbar
          </div>
          <Button variant="outline" onClick={() => setVertretungOpen(true)}>
            <UserPlus className="mr-1 size-4" />
            Vertretung
          </Button>
          <Button onClick={onWeiter}>
            Weiter: Einteilen
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      {/* Personalliste */}
      <div className="grid gap-2">
        {activePersonal.map((user) => {
          const abwesenheit = abwesenheitMap.get(user.id);
          const isSaving = savingUserId === user.id;
          const qualis = user.qualifikationen?.map((q) => q.qualifikation) || [];
          const istVertretung = !!user.vertretungFuerDatum;

          return (
            <Card
              key={user.id}
              className={`transition-colors ${
                abwesenheit ? "bg-slate-50 opacity-60" : ""
              }`}
            >
              <CardContent className="flex items-center gap-3 py-2 px-4">
                {/* Status Icon */}
                {abwesenheit ? (
                  <UserX className="size-4 shrink-0 text-red-400" />
                ) : (
                  <UserCheck className="size-4 shrink-0 text-emerald-500" />
                )}

                {/* Name + Qualifikationen */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        abwesenheit ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {user.nachname}, {user.vorname}
                    </span>
                    {istVertretung ? (
                      <Badge className="bg-amber-100 text-amber-700">
                        Vertretung
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {user.beschaeftigung === "ANGESTELLTER" ? "Ang." : "Bmt."}
                      </span>
                    )}
                  </div>
                  {qualis.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
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
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-1">
                {istVertretung && !isSaving && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveVertretung(user.id)}
                    title="Vertretung entfernen"
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                ) : abwesenheit ? (
                  <div className="flex items-center gap-2">
                    <Badge className={getGrundStyle(abwesenheit.grund).color}>
                      {getGrundStyle(abwesenheit.grund).label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAbwesend(user.id)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Aufheben
                    </Button>
                  </div>
                ) : (
                  <Select
                    onValueChange={(v) => { if (v) handleSetAbwesend(user.id, String(v)); }}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                      <SelectValue placeholder="Verfuegbar ✓" />
                    </SelectTrigger>
                    <SelectContent>
                      {ABWESENHEITS_GRUENDE.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-2">
        <Button onClick={onWeiter} size="lg">
          Weiter: Einteilen
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      {/* Tagesvertretung-Dialog */}
      <Dialog open={vertretungOpen} onOpenChange={setVertretungOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddVertretung}>
            <DialogHeader>
              <DialogTitle>Vertretung hinzufügen</DialogTitle>
              <DialogDescription>
                Aushilfe nur für diesen Tag – erscheint ausschließlich an diesem
                Datum in der Liste.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="v-vorname">Vorname</Label>
                  <Input
                    id="v-vorname"
                    required
                    value={vVorname}
                    onChange={(e) => setVVorname(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-nachname">Nachname</Label>
                  <Input
                    id="v-nachname"
                    required
                    value={vNachname}
                    onChange={(e) => setVNachname(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Qualifikationen</Label>
                <div className="flex flex-wrap gap-1.5">
                  {qualifikationen.map((q) => {
                    const active = vQualis.includes(q.id);
                    return (
                      <button
                        type="button"
                        key={q.id}
                        onClick={() => toggleVQuali(q.id)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? "text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        style={active ? { backgroundColor: q.farbe } : undefined}
                      >
                        {q.kuerzel}
                      </button>
                    );
                  })}
                  {qualifikationen.length === 0 && (
                    <span className="text-xs text-slate-400">
                      Keine Qualifikationen verfügbar.
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="submit"
                disabled={vSaving || !vVorname.trim() || !vNachname.trim()}
              >
                {vSaving && <Loader2 className="mr-1 size-4 animate-spin" />}
                Hinzufügen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
