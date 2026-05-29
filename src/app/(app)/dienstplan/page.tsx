"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Truck,
  Loader2,
  Star,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface Abteilung {
  id: string;
  name: string;
}

interface SchichtKonfiguration {
  id: string;
  schicht: "TAG" | "NACHT";
  startZeit: string;
  endZeit: string;
}

interface FahrzeugData {
  id: string;
  name: string;
  typ: string;
  aktiv: boolean;
  reihenfolge: number;
  positionen: FahrzeugPositionData[];
}

interface FahrzeugPositionData {
  id: string;
  name: string;
  fahrzeugId: string;
  reihenfolge: number;
}

interface UserData {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: "ADMIN" | "KOLLEGE";
  beschaeftigung: "BEAMTER" | "ANGESTELLTER";
  aktiv: boolean;
  abteilungId: string;
}

interface ZuweisungData {
  id: string;
  dienstplanId: string;
  userId: string;
  fahrzeugPositionId: string;
  sonderfunktionId: string | null;
  user: UserData;
  fahrzeugPosition: FahrzeugPositionData & { fahrzeug: FahrzeugData };
  sonderfunktion: { id: string; name: string } | null;
}

interface TagesFahrzeugData {
  id: string;
  dienstplanId: string;
  fahrzeugId: string;
  aktiv: boolean;
  fahrzeug: FahrzeugData;
}

interface DienstplanData {
  id: string;
  datum: string;
  schicht: "TAG" | "NACHT";
  abteilungId: string;
  veroeffentlicht: boolean;
  zuweisungen: ZuweisungData[];
  tagesFahrzeuge: TagesFahrzeugData[];
}

interface DienstplanResponse {
  datum: string;
  abteilungId: string;
  tag: DienstplanData | null;
  nacht: DienstplanData | null;
}

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
              </CardHeader>
              <CardContent>
                {isDeactivated ? (
                  <p className="text-sm text-slate-400 italic">
                    Fahrzeug ist an diesem Tag nicht verfuegbar.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {fahrzeug.positionen.map((pos) => {
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

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>("");
  const [dienstplanData, setDienstplanData] =
    useState<DienstplanResponse | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugData[]>([]);
  const [schichtZeiten, setSchichtZeiten] = useState<SchichtKonfiguration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingDienstplan, setLoadingDienstplan] = useState(false);

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

      if (!abtRes.ok) throw new Error("Abteilungen konnten nicht geladen werden");
      if (!fzRes.ok) throw new Error("Fahrzeuge konnten nicht geladen werden");
      if (!zeitRes.ok) throw new Error("Einstellungen konnten nicht geladen werden");

      const [abtData, fzData, zeitData] = await Promise.all([
        abtRes.json(),
        fzRes.json(),
        zeitRes.json(),
      ]);

      setAbteilungen(abtData);
      setFahrzeuge(fzData);
      setSchichtZeiten(zeitData);

      // Set default abteilung from session or first
      if (session?.user?.abteilungId) {
        setSelectedAbteilung(session.user.abteilungId);
      } else if (abtData.length > 0) {
        setSelectedAbteilung(abtData[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.abteilungId]);

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
              <Badge className="bg-emerald-100 text-emerald-700">
                Veroeffentlicht
              </Badge>
            ) : anyVeroeffentlicht ? (
              <Badge className="bg-amber-100 text-amber-700">
                Teilweise veroeffentlicht
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700">Entwurf</Badge>
            )
          ) : null}

          {session?.user?.rolle === "ADMIN" && (
            <Button
              variant="default"
              onClick={() =>
                router.push(
                  `/dienstplan/bearbeiten?datum=${formatDateApi(currentDate)}&abteilung=${selectedAbteilung}`
                )
              }
            >
              <Pencil className="size-4" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5">
            <Calendar className="size-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-900">
              {formatDateDisplay(currentDate)}
            </span>
          </div>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="size-4" />
          </Button>

          {!isToday(currentDate) && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Heute
            </Button>
          )}
        </div>

        {/* Abteilung Tabs */}
        {abteilungen.length > 0 && (
          <Tabs
            value={selectedAbteilung}
            onValueChange={(val) => setSelectedAbteilung(val as string)}
          >
            <TabsList>
              {abteilungen.map((abt) => (
                <TabsTrigger key={abt.id} value={abt.id}>
                  Wachabteilung {abt.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

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
        </div>
      )}
    </div>
  );
}
