"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Truck,
  Loader2,
  Check,
  Power,
  X,
  Send,
  ChevronLeft,
  User,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  UserData,
  FahrzeugData,
  FahrzeugPositionData,
  QualifikationData,
  DienstplanData,
  SonderfunktionData,
  SchichtKonfiguration,
  ZuweisungData,
} from "@/types/dienstplan";

// ----------------------------------------------------------------
// Quali-Validation Helpers
// ----------------------------------------------------------------

function getRequiredQualis(pos: FahrzeugPositionData): QualifikationData[] {
  return (pos.requiredQualifikationen || []).map((rq) => rq.qualifikation);
}

function getUserQualiIds(user: UserData): Set<string> {
  return new Set((user.qualifikationen || []).map((q) => q.qualifikation.id));
}

function checkQualiMatch(user: UserData, pos: FahrzeugPositionData): { ok: boolean; missing: QualifikationData[] } {
  const required = getRequiredQualis(pos);
  if (required.length === 0) return { ok: true, missing: [] };
  const userIds = getUserQualiIds(user);
  const missing = required.filter((q) => !userIds.has(q.id));
  return { ok: missing.length === 0, missing };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function getSchichtZeitraum(
  schicht: "TAG" | "NACHT",
  schichtZeiten: SchichtKonfiguration[]
): string {
  const config = schichtZeiten.find((s) => s.schicht === schicht);
  if (config) return `${config.startZeit} \u2013 ${config.endZeit}`;
  return schicht === "TAG" ? "07:00 \u2013 19:00" : "19:00 \u2013 07:00";
}

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

interface EinteilenEditorProps {
  verfuegbareKollegen: UserData[];
  fahrzeuge: FahrzeugData[];
  tagDienstplan: DienstplanData | null;
  nachtDienstplan: DienstplanData | null;
  sonderfunktionen: SonderfunktionData[];
  schichtZeiten: SchichtKonfiguration[];
  onZuweisungChanged: () => void;
  onZurueck: () => void;
  publishing: boolean;
  onPublish: () => void;
}

export function EinteilenEditor({
  verfuegbareKollegen,
  fahrzeuge,
  tagDienstplan,
  nachtDienstplan,
  sonderfunktionen,
  schichtZeiten,
  onZuweisungChanged,
  onZurueck,
  publishing,
  onPublish,
}: EinteilenEditorProps) {
  const [activeSchicht, setActiveSchicht] = useState<"TAG" | "NACHT">("TAG");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [savingPositionId, setSavingPositionId] = useState<string | null>(null);

  const dienstplan =
    activeSchicht === "TAG" ? tagDienstplan : nachtDienstplan;
  const otherDienstplan =
    activeSchicht === "TAG" ? nachtDienstplan : tagDienstplan;

  // Zuweisungen der aktuellen Schicht
  const zuweisungByPosition = new Map<string, ZuweisungData>();
  const assignedUserIds = new Set<string>();
  if (dienstplan) {
    for (const z of dienstplan.zuweisungen) {
      zuweisungByPosition.set(z.fahrzeugPositionId, z);
      assignedUserIds.add(z.userId);
    }
  }

  // Zuweisungen der anderen Schicht (fuer Angestellter/Azubi-Check)
  const otherSchichtUserIds = new Map<string, "BEAMTER" | "ANGESTELLTER" | "AZUBI">();
  if (otherDienstplan) {
    for (const z of otherDienstplan.zuweisungen) {
      otherSchichtUserIds.set(z.userId, z.user.beschaeftigung);
    }
  }

  // Deaktivierte Fahrzeuge
  const deactivatedFahrzeuge = new Set<string>();
  if (dienstplan) {
    for (const tf of dienstplan.tagesFahrzeuge) {
      if (!tf.aktiv) deactivatedFahrzeuge.add(tf.fahrzeugId);
    }
  }

  const activeFahrzeuge = fahrzeuge.filter((f) => f.aktiv);

  // Kollegen aufteilen: regulaere vs. Azubis
  const regulaereKollegen = verfuegbareKollegen.filter(
    (u) => u.beschaeftigung !== "AZUBI"
  );
  const azubis = verfuegbareKollegen.filter(
    (u) => u.beschaeftigung === "AZUBI"
  );

  const sortByAssignment = (a: UserData, b: UserData) => {
    const aAssigned = assignedUserIds.has(a.id);
    const bAssigned = assignedUserIds.has(b.id);
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    return a.nachname.localeCompare(b.nachname);
  };

  const kollegenSorted = [...regulaereKollegen].sort(sortByAssignment);
  const azubisSorted = [...azubis].sort(sortByAssignment);

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  async function handleAssign(fahrzeugPositionId: string, pos?: FahrzeugPositionData) {
    if (!selectedUserId || !dienstplan) return;

    // Angestellter/Azubi-Check
    const user = verfuegbareKollegen.find((u) => u.id === selectedUserId);
    if (
      (user?.beschaeftigung === "ANGESTELLTER" || user?.beschaeftigung === "AZUBI") &&
      otherSchichtUserIds.has(selectedUserId)
    ) {
      toast.error(
        user.beschaeftigung === "AZUBI"
          ? "Azubis koennen nur in einer Schicht eingeteilt werden."
          : "Angestellte koennen nur in einer Schicht eingeteilt werden."
      );
      return;
    }

    // Quali-Check (Warnung, kein Block)
    if (user && pos) {
      const { ok, missing } = checkQualiMatch(user, pos);
      if (!ok) {
        toast.warning(
          `Fehlende Qualifikation: ${missing.map((q) => q.kuerzel).join(", ")}`,
          { duration: 4000 }
        );
      }
    }

    setSavingPositionId(fahrzeugPositionId);
    try {
      const res = await fetch("/api/dienstplan/zuweisung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienstplanId: dienstplan.id,
          userId: selectedUserId,
          fahrzeugPositionId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Zuweisen");
      }
      setSelectedUserId(null);
      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingPositionId(null);
    }
  }

  async function handleRemoveAssignment(zuweisungId: string) {
    setSavingPositionId(zuweisungId);
    try {
      const res = await fetch("/api/dienstplan/zuweisung", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zuweisungId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Entfernen");
      }
      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingPositionId(null);
    }
  }

  async function handleSonderfunktion(
    zuweisungData: ZuweisungData,
    sonderfunktionId: string | null
  ) {
    if (!dienstplan) return;
    try {
      const res = await fetch("/api/dienstplan/zuweisung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienstplanId: dienstplan.id,
          userId: zuweisungData.userId,
          fahrzeugPositionId: zuweisungData.fahrzeugPositionId,
          sonderfunktionId:
            sonderfunktionId === "__none__" ? null : sonderfunktionId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler");
      }
      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  }

  async function handleToggleFahrzeug(fahrzeugId: string, aktiv: boolean) {
    if (!dienstplan) return;
    try {
      const res = await fetch("/api/dienstplan/tagesfahrzeug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienstplanId: dienstplan.id,
          fahrzeugId,
          aktiv,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler");
      }
      toast.success(aktiv ? "Fahrzeug aktiviert" : "Fahrzeug deaktiviert");
      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  }

  const allPublished =
    (tagDienstplan?.veroeffentlicht ?? false) &&
    (nachtDienstplan?.veroeffentlicht ?? false);
  const anyExists = !!(tagDienstplan || nachtDienstplan);

  // Zaehler
  const totalPositions = activeFahrzeuge
    .filter((f) => !deactivatedFahrzeuge.has(f.id))
    .reduce((sum, f) => sum + f.positionen.length, 0);
  const filledPositions = dienstplan?.zuweisungen.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onZurueck}>
            <ChevronLeft className="size-4" />
            Verfuegbarkeit
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Schritt 2: Einteilen
            </h2>
            <p className="text-sm text-slate-500">
              {filledPositions}/{totalPositions} Positionen besetzt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {anyExists && (
            <Button
              variant="default"
              onClick={onPublish}
              disabled={publishing}
              className={allPublished
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {allPublished ? "Aktualisieren & Senden" : "Veroeffentlichen"}
            </Button>
          )}
        </div>
      </div>

      {/* Schicht Tabs */}
      <Tabs
        value={activeSchicht}
        onValueChange={(v) => {
          setActiveSchicht(v as "TAG" | "NACHT");
          setSelectedUserId(null);
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="TAG" className="flex-1">
            Tagschicht ({getSchichtZeitraum("TAG", schichtZeiten)})
            {tagDienstplan?.veroeffentlicht && (
              <Check className="ml-1 size-3 text-emerald-600" />
            )}
          </TabsTrigger>
          <TabsTrigger value="NACHT" className="flex-1">
            Nachtschicht ({getSchichtZeitraum("NACHT", schichtZeiten)})
            {nachtDienstplan?.veroeffentlicht && (
              <Check className="ml-1 size-3 text-emerald-600" />
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!dienstplan ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        /* Split View */
        <div className="flex flex-col lg:flex-row gap-4">
          {/* LINKS: Kollegen */}
          <div className="lg:w-72 xl:w-80 shrink-0">
            <div className="sticky top-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Verfuegbar ({kollegenSorted.filter((u) => !assignedUserIds.has(u.id)).length})
              </h3>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-1">
                {kollegenSorted.map((user) => {
                  const isAssigned = assignedUserIds.has(user.id);
                  const isSelected = selectedUserId === user.id;
                  const isBlockedOtherSchicht =
                    (user.beschaeftigung === "ANGESTELLTER" || user.beschaeftigung === "AZUBI") &&
                    otherSchichtUserIds.has(user.id);
                  const qualis =
                    user.qualifikationen?.map((q) => q.qualifikation) || [];

                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (isAssigned || isBlockedOtherSchicht) return;
                        setSelectedUserId(isSelected ? null : user.id);
                      }}
                      disabled={isAssigned || isBlockedOtherSchicht}
                      className={`w-full text-left rounded-lg border p-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : isAssigned
                          ? "border-slate-100 bg-slate-50 opacity-40"
                          : isBlockedOtherSchicht
                          ? "border-red-100 bg-red-50 opacity-40 cursor-not-allowed"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 shrink-0 text-slate-400" />
                        <span
                          className={`text-sm font-medium ${
                            isAssigned
                              ? "line-through text-slate-400"
                              : "text-slate-900"
                          }`}
                        >
                          {user.nachname}, {user.vorname}
                        </span>
                        {isBlockedOtherSchicht && (
                          <span className="text-[10px] text-red-500">
                            (andere Schicht)
                          </span>
                        )}
                      </div>
                      {qualis.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1 ml-5">
                          {qualis.map((q) => (
                            <span
                              key={q.id}
                              className="inline-block rounded px-1 py-0 text-[9px] font-medium text-white"
                              style={{ backgroundColor: q.farbe }}
                            >
                              {q.kuerzel}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Azubis - separate Gruppe */}
                {azubisSorted.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-amber-700 mt-3 pt-3 border-t border-amber-200">
                      Azubis ({azubisSorted.filter((u) => !assignedUserIds.has(u.id)).length})
                    </h3>
                    {azubisSorted.map((user) => {
                      const isAssigned = assignedUserIds.has(user.id);
                      const isSelected = selectedUserId === user.id;
                      const isBlockedOtherSchicht =
                        otherSchichtUserIds.has(user.id);
                      const qualis =
                        user.qualifikationen?.map((q) => q.qualifikation) || [];

                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            if (isAssigned || isBlockedOtherSchicht) return;
                            setSelectedUserId(isSelected ? null : user.id);
                          }}
                          disabled={isAssigned || isBlockedOtherSchicht}
                          className={`w-full text-left rounded-lg border p-2 transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                              : isAssigned
                              ? "border-slate-100 bg-slate-50 opacity-40"
                              : isBlockedOtherSchicht
                              ? "border-red-100 bg-red-50 opacity-40 cursor-not-allowed"
                              : "border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-50 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="size-3.5 shrink-0 text-amber-500" />
                            <span
                              className={`text-sm font-medium ${
                                isAssigned
                                  ? "line-through text-slate-400"
                                  : "text-slate-900"
                              }`}
                            >
                              {user.nachname}, {user.vorname}
                            </span>
                            <span className="text-[9px] font-medium bg-amber-100 text-amber-700 rounded px-1 py-0">
                              Azubi
                            </span>
                            {isBlockedOtherSchicht && (
                              <span className="text-[10px] text-red-500">
                                (andere Schicht)
                              </span>
                            )}
                          </div>
                          {qualis.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1 ml-5">
                              {qualis.map((q) => (
                                <span
                                  key={q.id}
                                  className="inline-block rounded px-1 py-0 text-[9px] font-medium text-white"
                                  style={{ backgroundColor: q.farbe }}
                                >
                                  {q.kuerzel}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
              {selectedUserId && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-sm text-blue-700">
                  Klicke jetzt auf eine leere Position rechts um zuzuweisen
                </div>
              )}
            </div>
          </div>

          {/* RECHTS: Fahrzeuge */}
          <div className="flex-1 space-y-3">
            {activeFahrzeuge.map((fahrzeug) => {
              const isDeactivated = deactivatedFahrzeuge.has(fahrzeug.id);

              return (
                <Card
                  key={fahrzeug.id}
                  className={isDeactivated ? "opacity-40" : ""}
                >
                  <CardHeader className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-slate-500" />
                        <CardTitle className="text-sm">{fahrzeug.name}</CardTitle>
                        <span className="text-xs text-slate-400">
                          {fahrzeug.typ}
                        </span>
                      </div>
                      <Button
                        variant={isDeactivated ? "default" : "ghost"}
                        size="xs"
                        onClick={() =>
                          handleToggleFahrzeug(fahrzeug.id, isDeactivated)
                        }
                      >
                        <Power className="size-3" />
                        {isDeactivated ? "Aktivieren" : ""}
                      </Button>
                    </div>
                  </CardHeader>
                  {!isDeactivated && (
                    <CardContent className="py-1 px-4 pb-3">
                      <div className="grid gap-1">
                        {fahrzeug.positionen.map((pos) => {
                          const zuweisung = zuweisungByPosition.get(pos.id);
                          const isSaving = savingPositionId === pos.id || savingPositionId === zuweisung?.id;
                          const requiredQualis = getRequiredQualis(pos);
                          // Check if assigned user meets requirements
                          const assignedUser = zuweisung ? verfuegbareKollegen.find((u) => u.id === zuweisung.userId) : null;
                          const qualiMismatch = zuweisung && assignedUser ? !checkQualiMatch(assignedUser, pos).ok : false;

                          return (
                            <div
                              key={pos.id}
                              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                                qualiMismatch ? "bg-amber-50 border border-amber-200" : ""
                              }`}
                            >
                              {/* Positionsname + Required Qualis */}
                              <div className="w-32 shrink-0">
                                <span className="text-xs font-medium text-slate-500">
                                  {pos.name}
                                </span>
                                {requiredQualis.length > 0 && (
                                  <div className="flex gap-0.5 mt-0.5">
                                    {requiredQualis.map((q) => (
                                      <span
                                        key={q.id}
                                        className="inline-block rounded px-1 py-0 text-[8px] font-medium text-white"
                                        style={{ backgroundColor: q.farbe }}
                                      >
                                        {q.kuerzel}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {isSaving ? (
                                <Loader2 className="size-4 animate-spin text-slate-400" />
                              ) : zuweisung ? (
                                /* Besetzt */
                                <div className="flex items-center gap-2 flex-1">
                                  {qualiMismatch && (
                                    <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                                  )}
                                  <span className="text-sm font-medium text-slate-900">
                                    {zuweisung.user.nachname},{" "}
                                    {zuweisung.user.vorname}
                                  </span>
                                  {/* Sonderfunktion */}
                                  <Select
                                    value={
                                      zuweisung.sonderfunktionId ?? "__none__"
                                    }
                                    onValueChange={(v) =>
                                      handleSonderfunktion(zuweisung, v)
                                    }
                                  >
                                    <SelectTrigger className="h-6 w-32 text-xs">
                                      <SelectValue placeholder="Sonderfkt." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">
                                        <span className="text-slate-400">
                                          Keine
                                        </span>
                                      </SelectItem>
                                      {sonderfunktionen
                                        .filter((sf) => sf.aktiv)
                                        .map((sf) => (
                                          <SelectItem key={sf.id} value={sf.id}>
                                            {sf.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {/* Entfernen */}
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() =>
                                      handleRemoveAssignment(zuweisung.id)
                                    }
                                    className="text-slate-400 hover:text-red-500"
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              ) : (
                                /* Leer - klickbar */
                                <button
                                  onClick={() => handleAssign(pos.id, pos)}
                                  disabled={!selectedUserId}
                                  className={`flex-1 rounded border border-dashed px-2 py-1 text-xs transition-colors ${
                                    selectedUserId
                                      ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      : "border-slate-200 text-slate-300"
                                  }`}
                                >
                                  {selectedUserId
                                    ? "Hier zuweisen"
                                    : "\u2014 nicht besetzt \u2014"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
