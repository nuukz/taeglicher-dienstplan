"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserX, UserCheck, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserData, AbwesenheitData } from "@/types/dienstplan";

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
  onAbwesenheitChanged: () => void;
  onWeiter: () => void;
}

export function VerfuegbarkeitEditor({
  personal,
  abwesenheiten,
  datum,
  onAbwesenheitChanged,
  onWeiter,
}: VerfuegbarkeitEditorProps) {
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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
                    <span className="text-xs text-slate-400">
                      {user.beschaeftigung === "ANGESTELLTER" ? "Ang." : "Bmt."}
                    </span>
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

                {/* Abwesenheits-Aktion */}
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
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Abwesend..." />
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
    </div>
  );
}
