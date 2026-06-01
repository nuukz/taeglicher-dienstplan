"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Truck,
  Loader2,
  Star,
  Pencil,
  FileDown,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { exportDienstplanPdf } from "@/lib/pdf-export";
import { getAnzeigeQuelle } from "@/lib/mitbesetzung";
import { MonatsKalender } from "@/components/dienstplan/monats-kalender";
import type {
  Abteilung,
  FahrzeugData,
  SchichtKonfiguration,
  DienstplanData,
  DienstplanResponse,
  ZuweisungData,
} from "@/types/dienstplan";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ----------------------------------------------------------------
// Schicht Section Component
// ----------------------------------------------------------------

function SchichtSection({
  label,
  zeitraum,
  dienstplan,
  fahrzeuge,
  currentUserId,
}: {
  label: string;
  zeitraum: string;
  dienstplan: DienstplanData | null;
  fahrzeuge: FahrzeugData[];
  currentUserId: string | undefined;
}) {
  // Build a map of deactivated vehicles for this schicht
  const deactivatedFahrzeuge = new Set<string>();
  if (dienstplan) {
    for (const tf of dienstplan.tagesFahrzeuge) {
      if (!tf.aktiv) {
        deactivatedFahrzeuge.add(tf.fahrzeugId);
      }
    }
  }

  // Build a map: fahrzeugPositionId -> Zuweisung
  const zuweisungByPosition = new Map<string, ZuweisungData>();
  if (dienstplan) {
    for (const z of dienstplan.zuweisungen) {
      zuweisungByPosition.set(z.fahrzeugPositionId, z);
    }
  }

  // Collect sonderfunktionen from zuweisungen
  const sonderfunktionen = dienstplan
    ? dienstplan.zuweisungen.filter((z) => z.sonderfunktion)
    : [];

  // Only show active fahrzeuge
  const activeFahrzeuge = fahrzeuge.filter((f) => f.aktiv);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
        <span className="text-sm text-slate-500">{zeitraum}</span>
      </div>

      {/* Vehicle Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeFahrzeuge.map((fahrzeug) => {
          const isDeactivated = deactivatedFahrzeuge.has(fahrzeug.id);
          const { positionen, mitbesetztVon } = getAnzeigeQuelle(
            fahrzeug,
            fahrzeuge
          );

          return (
            <Card
              key={fahrzeug.id}
              className={isDeactivated ? "opacity-50" : ""}
            >
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-slate-500" />
                    <CardTitle className="text-sm">{fahrzeug.name}</CardTitle>
                    <span className="text-xs text-slate-400">
                      {fahrzeug.typ}
                    </span>
                  </div>
                  {isDeactivated && (
                    <Badge variant="secondary">Ausser Dienst</Badge>
                  )}
                </div>
                {mitbesetztVon && !isDeactivated && (
                  <p className="text-xs text-blue-600">
                    mitbesetzt von {mitbesetztVon}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {isDeactivated ? (
                  <p className="text-sm text-slate-400 italic">
                    Fahrzeug ist an diesem Tag nicht verfuegbar.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {positionen.map((pos) => {
                      const zuweisung = zuweisungByPosition.get(pos.id);
                      const isCurrentUser =
                        zuweisung && zuweisung.userId === currentUserId;

                      return (
                        <div
                          key={pos.id}
                          className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                            isCurrentUser
                              ? "bg-red-50 ring-1 ring-red-200"
                              : ""
                          }`}
                        >
                          <span className="text-slate-500 min-w-0 shrink-0">
                            {pos.name}
                          </span>
                          <span
                            className={`text-right truncate ml-2 ${
                              isCurrentUser
                                ? "font-semibold text-red-700"
                                : zuweisung
                                  ? "font-medium text-slate-900"
                                  : "text-slate-300 italic"
                            }`}
                          >
                            {zuweisung
                              ? `${zuweisung.user.vorname} ${zuweisung.user.nachname}`
                              : "\u2014 Nicht besetzt \u2014"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sonderfunktionen */}
      {sonderfunktionen.length > 0 && (
        <div className="mt-2">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Star className="size-4" />
            Sonderfunktionen
          </h3>
          <div className="flex flex-wrap gap-2">
            {sonderfunktionen.map((z) => (
              <Badge key={z.id} variant="outline">
                {z.sonderfunktion!.name}: {z.user.vorname} {z.user.nachname}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function DienstplanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSysop = session?.user?.rolle === "SYSOP";
  const waParam = searchParams.get("wa");

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>("");
  const [abteilungName, setAbteilungName] = useState<string>("");
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [dienstplanData, setDienstplanData] =
    useState<DienstplanResponse | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugData[]>([]);
  const [schichtZeiten, setSchichtZeiten] = useState<SchichtKonfiguration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingDienstplan, setLoadingDienstplan] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // ----------------------------------------------------------
  // Initial data load
  // ----------------------------------------------------------

  const fetchBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [abtRes, fzRes, zeitRes] = await Promise.all([
        fetch("/api/abteilungen"),
        fetch("/api/fahrzeuge"),
        fetch("/api/einstellungen"),
      ]);

      if (!fzRes.ok) throw new Error("Fahrzeuge konnten nicht geladen werden");
      if (!zeitRes.ok) throw new Error("Einstellungen konnten nicht geladen werden");

      const [abtData, fzData, zeitData] = await Promise.all([
        abtRes.ok ? abtRes.json() : [],
        fzRes.json(),
        zeitRes.json(),
      ]);

      setFahrzeuge(fzData);
      setSchichtZeiten(zeitData);
      setAbteilungen(abtData);

      // SYSOP darf jede Abteilung waehlen (?wa=...), alle anderen nur die eigene
      const ziel = isSysop && waParam ? waParam : session?.user?.abteilungId;
      if (ziel) {
        setSelectedAbteilung(ziel);
        const abt = abtData.find((a: Abteilung) => a.id === ziel);
        if (abt) setAbteilungName(abt.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.abteilungId, isSysop, waParam]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // ----------------------------------------------------------
  // Load dienstplan when date or abteilung changes
  // ----------------------------------------------------------

  const fetchDienstplan = useCallback(async () => {
    if (!selectedAbteilung) return;

    setLoadingDienstplan(true);
    try {
      const datum = formatDateApi(currentDate);
      const res = await fetch(
        `/api/dienstplan?datum=${datum}&abteilungId=${selectedAbteilung}`
      );

      if (!res.ok) throw new Error("Dienstplan konnte nicht geladen werden");

      const data: DienstplanResponse = await res.json();
      setDienstplanData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoadingDienstplan(false);
    }
  }, [currentDate, selectedAbteilung]);

  useEffect(() => {
    fetchDienstplan();
  }, [fetchDienstplan]);

  // ----------------------------------------------------------
  // Date navigation
  // ----------------------------------------------------------

  function goToPreviousDay() {
    setCurrentDate((d) => addDays(d, -1));
  }

  function goToNextDay() {
    setCurrentDate((d) => addDays(d, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  // SYSOP: aktive Wachabteilung wechseln (URL bleibt Quelle der Wahrheit)
  function selectAbteilung(id: string) {
    setSelectedAbteilung(id);
    const abt = abteilungen.find((a) => a.id === id);
    if (abt) setAbteilungName(abt.name);
    router.replace(`/dienstplan?wa=${id}`, { scroll: false });
  }

  // ----------------------------------------------------------
  // Schicht times lookup
  // ----------------------------------------------------------

  function getSchichtZeitraum(schicht: "TAG" | "NACHT"): string {
    const config = schichtZeiten.find((s) => s.schicht === schicht);
    if (config) {
      return `${config.startZeit} \u2013 ${config.endZeit}`;
    }
    return schicht === "TAG" ? "07:00 \u2013 19:00" : "19:00 \u2013 07:00";
  }

  // ----------------------------------------------------------
  // Publish status
  // ----------------------------------------------------------

  const tagVeroeffentlicht = dienstplanData?.tag?.veroeffentlicht ?? false;
  const nachtVeroeffentlicht = dienstplanData?.nacht?.veroeffentlicht ?? false;
  const anyVeroeffentlicht = tagVeroeffentlicht || nachtVeroeffentlicht;
  const allVeroeffentlicht = tagVeroeffentlicht && nachtVeroeffentlicht;

  // Version: höchste Version von Tag/Nacht
  const maxVersion = Math.max(
    dienstplanData?.tag?.version ?? 0,
    dienstplanData?.nacht?.version ?? 0,
  );

  // Alle Änderungen zusammenführen (Tag + Nacht), nach Datum sortiert
  const alleAenderungen = [
    ...(dienstplanData?.tag?.aenderungen ?? []),
    ...(dienstplanData?.nacht?.aenderungen ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold text-slate-900">Dienstplan</h1>
          <p className="text-sm text-slate-500">Tagesansicht</p>
        </div>

        {/* Status + Admin link */}
        <div className="flex items-center gap-2">
          {dienstplanData?.tag || dienstplanData?.nacht ? (
            allVeroeffentlicht ? (
              <>
                <Badge className="bg-emerald-100 text-emerald-700">
                  Veroeffentlicht
                </Badge>
                {maxVersion > 0 && (
                  <Badge variant="outline" className="text-xs">
                    v{maxVersion}
                  </Badge>
                )}
              </>
            ) : anyVeroeffentlicht ? (
              <Badge className="bg-amber-100 text-amber-700">
                Teilweise veroeffentlicht
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700">Entwurf</Badge>
            )
          ) : null}

          {dienstplanData && (
            <Button
              variant="outline"
              onClick={() =>
                exportDienstplanPdf({
                  datum: formatDateApi(currentDate),
                  abteilungName,
                  tag: dienstplanData.tag,
                  nacht: dienstplanData.nacht,
                  fahrzeuge,
                  schichtZeiten,
                })
              }
            >
              <FileDown className="size-4" />
              PDF
            </Button>
          )}

          {session?.user?.rolle && session.user.rolle !== "KOLLEGE" && (
            <Button
              variant="default"
              onClick={() =>
                router.push(
                  `/dienstplan/bearbeiten?datum=${formatDateApi(currentDate)}${
                    isSysop && selectedAbteilung ? `&wa=${selectedAbteilung}` : ""
                  }`
                )
              }
            >
              <Pencil className="size-4" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {/* SYSOP: Wachabteilung waehlen */}
      {isSysop && abteilungen.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            Wachabteilung:
          </span>
          <div className="inline-flex rounded-lg border bg-white p-0.5">
            {abteilungen.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAbteilung(a.id)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  selectedAbteilung === a.id
                    ? "bg-red-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                WA {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="size-4" />
          </Button>

          <button
            onClick={() => setShowCalendar((v) => !v)}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Calendar className="size-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-900">
              {formatDateDisplay(currentDate)}
            </span>
          </button>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="size-4" />
          </Button>

          {!isToday(currentDate) && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Heute
            </Button>
          )}
        </div>
      </div>

      {/* Monatskalender */}
      {showCalendar && (
        <MonatsKalender
          currentDate={currentDate}
          abteilungName={abteilungName}
          abteilungId={selectedAbteilung}
          calendarMonth={calendarMonth}
          onDateSelect={(date) => {
            setCurrentDate(date);
            setShowCalendar(false);
          }}
          onMonthChange={(offset) => {
            setCalendarMonth((prev) => {
              const next = new Date(prev);
              next.setMonth(next.getMonth() + offset);
              return next;
            });
          }}
        />
      )}

      {/* Content */}
      {loadingDienstplan ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tagschicht */}
          <SchichtSection
            label="Tagschicht"
            zeitraum={getSchichtZeitraum("TAG")}
            dienstplan={dienstplanData?.tag ?? null}
            fahrzeuge={fahrzeuge}
            currentUserId={session?.user?.id}
          />

          <Separator />

          {/* Nachtschicht */}
          <SchichtSection
            label="Nachtschicht"
            zeitraum={getSchichtZeitraum("NACHT")}
            dienstplan={dienstplanData?.nacht ?? null}
            fahrzeuge={fahrzeuge}
            currentUserId={session?.user?.id}
          />

          {/* Änderungsverlauf */}
          {alleAenderungen.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <History className="size-4" />
                  Änderungsverlauf
                </h2>
                <div className="space-y-2">
                  {alleAenderungen.map((aenderung) => {
                    const isExpanded = expandedVersion === aenderung.id;
                    const snapshot = aenderung.snapshot
                      ? JSON.parse(aenderung.snapshot) as { user: string; fahrzeug: string; position: string }[]
                      : null;
                    const zeit = new Date(aenderung.createdAt);

                    return (
                      <div
                        key={aenderung.id}
                        className="rounded-lg border bg-white"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedVersion(isExpanded ? null : aenderung.id)
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              v{aenderung.version}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {aenderung.beschreibung}
                              </p>
                              <p className="text-xs text-slate-500">
                                {zeit.toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}{" "}
                                {zeit.toLocaleTimeString("de-DE", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          {snapshot && (
                            <ChevronDown
                              className={`size-4 text-slate-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </button>
                        {isExpanded && snapshot && (
                          <div className="border-t px-4 py-3">
                            <div className="space-y-1">
                              {snapshot.map((z, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-slate-500">
                                    {z.fahrzeug} – {z.position}
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    {z.user}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
