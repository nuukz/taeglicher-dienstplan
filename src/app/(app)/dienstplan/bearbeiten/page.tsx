"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Truck,
  Loader2,
  Check,
  AlertTriangle,
  ArrowLeft,
  Send,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  sonderfunktion: SonderfunktionData | null;
}

interface SonderfunktionData {
  id: string;
  name: string;
  aktiv: boolean;
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

function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
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
// Position Editor Row Component
// ----------------------------------------------------------------

function PositionRow({
  position,
  zuweisung,
  dienstplanId,
  allPersonal,
  assignedUserIdsInSchicht,
  otherSchichtUserIds,
  sonderfunktionen,
  onZuweisungChanged,
}: {
  position: FahrzeugPositionData;
  zuweisung: ZuweisungData | undefined;
  dienstplanId: string;
  allPersonal: UserData[];
  assignedUserIdsInSchicht: Set<string>;
  otherSchichtUserIds: Map<string, "BEAMTER" | "ANGESTELLTER">;
  sonderfunktionen: SonderfunktionData[];
  onZuweisungChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [savingSonder, setSavingSonder] = useState(false);

  async function handlePersonSelect(userId: string | null) {
    if (!userId || userId === "__none__") {
      // Remove assignment
      if (zuweisung) {
        setSaving(true);
        try {
          const res = await fetch("/api/dienstplan/zuweisung", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zuweisungId: zuweisung.id }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Fehler beim Entfernen");
          }
          onZuweisungChanged();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Fehler");
        } finally {
          setSaving(false);
        }
      }
      return;
    }

    // Check Angestellter restriction
    const otherInfo = otherSchichtUserIds.get(userId);
    if (otherInfo === "ANGESTELLTER") {
      toast.error(
        "Angestellte koennen nur in einer Schicht (Tag ODER Nacht) eingeteilt werden.",
        { icon: <AlertTriangle className="size-4" /> }
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dienstplan/zuweisung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienstplanId,
          userId,
          fahrzeugPositionId: position.id,
          sonderfunktionId: zuweisung?.sonderfunktionId ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Zuweisen");
      }

      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleSonderfunktionSelect(sonderfunktionId: string | null) {
    if (!zuweisung) return;

    const sfId =
      !sonderfunktionId || sonderfunktionId === "__none__" ? null : sonderfunktionId;

    setSavingSonder(true);
    try {
      const res = await fetch("/api/dienstplan/zuweisung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dienstplanId,
          userId: zuweisung.userId,
          fahrzeugPositionId: position.id,
          sonderfunktionId: sfId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Zuweisen");
      }

      onZuweisungChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingSonder(false);
    }
  }

  // Filter active personal and sort by Nachname
  const activePersonal = allPersonal
    .filter((u) => u.aktiv)
    .sort((a, b) => a.nachname.localeCompare(b.nachname));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Position label */}
      <span className="w-32 shrink-0 text-sm font-medium text-slate-600">
        {position.name}
      </span>

      {/* Person select */}
      <div className="flex-1">
        <Select
          value={zuweisung?.userId ?? "__none__"}
          onValueChange={handlePersonSelect}
          disabled={saving}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Person waehlen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-slate-400 italic">
                \u2014 Nicht besetzt \u2014
              </span>
            </SelectItem>
            {activePersonal.map((user) => {
              const isAssigned =
                assignedUserIdsInSchicht.has(user.id) &&
                zuweisung?.userId !== user.id;
              const isInOtherSchicht = otherSchichtUserIds.has(user.id);
              const isAngestellterInOther =
                isInOtherSchicht &&
                otherSchichtUserIds.get(user.id) === "ANGESTELLTER";

              let label = `${user.nachname}, ${user.vorname}`;
              if (isAssigned) label += " (bereits eingeteilt)";
              if (isAngestellterInOther)
                label += " (andere Schicht - Angestellter)";
              else if (isInOtherSchicht) label += " (andere Schicht)";

              return (
                <SelectItem
                  key={user.id}
                  value={user.id}
                  disabled={isAssigned || isAngestellterInOther}
                  className={
                    isAssigned || isAngestellterInOther
                      ? "opacity-50"
                      : ""
                  }
                >
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Sonderfunktion select (only when person is assigned) */}
      {zuweisung && (
        <div className="w-40 shrink-0">
          <Select
            value={zuweisung.sonderfunktionId ?? "__none__"}
            onValueChange={handleSonderfunktionSelect}
            disabled={savingSonder}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Sonderfunktion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-slate-400 text-xs">Keine</span>
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
        </div>
      )}

      {/* Saving indicator */}
      {(saving || savingSonder) && (
        <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Schicht Editor Section Component
// ----------------------------------------------------------------

function SchichtEditorSection({
  label,
  zeitraum,
  schichtTyp: _schichtTyp,
  dienstplan,
  fahrzeuge,
  allPersonal,
  otherSchichtDienstplan,
  sonderfunktionen,
  onZuweisungChanged,
  onToggleFahrzeug,
}: {
  label: string;
  zeitraum: string;
  schichtTyp: "TAG" | "NACHT";
  dienstplan: DienstplanData | null;
  fahrzeuge: FahrzeugData[];
  allPersonal: UserData[];
  otherSchichtDienstplan: DienstplanData | null;
  sonderfunktionen: SonderfunktionData[];
  onZuweisungChanged: () => void;
  onToggleFahrzeug: (
    dienstplanId: string,
    fahrzeugId: string,
    aktiv: boolean
  ) => void;
}) {
  if (!dienstplan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <span className="text-sm text-slate-500">{zeitraum}</span>
        </div>
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
          <Loader2 className="size-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-400">
            Dienstplan wird erstellt...
          </span>
        </div>
      </div>
    );
  }

  // Build sets of assigned users
  const assignedUserIdsInSchicht = new Set<string>();
  for (const z of dienstplan.zuweisungen) {
    assignedUserIdsInSchicht.add(z.userId);
  }

  // Build map of users in the OTHER schicht: userId -> beschaeftigung
  const otherSchichtUserIds = new Map<string, "BEAMTER" | "ANGESTELLTER">();
  if (otherSchichtDienstplan) {
    for (const z of otherSchichtDienstplan.zuweisungen) {
      otherSchichtUserIds.set(z.userId, z.user.beschaeftigung);
    }
  }

  // Build map of deactivated vehicles
  const deactivatedFahrzeuge = new Set<string>();
  for (const tf of dienstplan.tagesFahrzeuge) {
    if (!tf.aktiv) {
      deactivatedFahrzeuge.add(tf.fahrzeugId);
    }
  }

  // Build map: fahrzeugPositionId -> Zuweisung
  const zuweisungByPosition = new Map<string, ZuweisungData>();
  for (const z of dienstplan.zuweisungen) {
    zuweisungByPosition.set(z.fahrzeugPositionId, z);
  }

  // Only show active fahrzeuge
  const activeFahrzeuge = fahrzeuge.filter((f) => f.aktiv);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <span className="text-sm text-slate-500">{zeitraum}</span>
        </div>
        {dienstplan.veroeffentlicht ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            <Check className="size-3" />
            Veroeffentlicht
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-700">Entwurf</Badge>
        )}
      </div>

      {/* Vehicle Cards */}
      <div className="space-y-4">
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
                  <div className="flex items-center gap-2">
                    {isDeactivated && (
                      <Badge variant="secondary">Ausser Dienst</Badge>
                    )}
                    <Button
                      variant={isDeactivated ? "default" : "destructive"}
                      size="xs"
                      onClick={() =>
                        onToggleFahrzeug(
                          dienstplan.id,
                          fahrzeug.id,
                          isDeactivated // toggle: if deactivated, set active=true
                        )
                      }
                    >
                      <Power className="size-3" />
                      {isDeactivated ? "Aktivieren" : "Deaktivieren"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isDeactivated ? (
                  <p className="text-sm text-slate-400 italic">
                    Fahrzeug ist an diesem Tag nicht verfuegbar. Klicke
                    &quot;Aktivieren&quot; um es wieder einzuplanen.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fahrzeug.positionen.map((pos) => (
                      <PositionRow
                        key={pos.id}
                        position={pos}
                        zuweisung={zuweisungByPosition.get(pos.id)}
                        dienstplanId={dienstplan.id}
                        allPersonal={allPersonal}
                        assignedUserIdsInSchicht={assignedUserIdsInSchicht}
                        otherSchichtUserIds={otherSchichtUserIds}
                        sonderfunktionen={sonderfunktionen}
                        onZuweisungChanged={onZuweisungChanged}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Inner Page (needs useSearchParams, wrapped in Suspense)
// ----------------------------------------------------------------

function DienstplanBearbeitenInner() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const initialDatum = searchParams.get("datum");
  const initialAbteilung = searchParams.get("abteilung");

  const [currentDate, setCurrentDate] = useState<Date>(
    initialDatum ? parseDateString(initialDatum) : new Date()
  );
  const [abteilungen, setAbteilungen] = useState<Abteilung[]>([]);
  const [selectedAbteilung, setSelectedAbteilung] = useState<string>(
    initialAbteilung || ""
  );
  const [dienstplanData, setDienstplanData] =
    useState<DienstplanResponse | null>(null);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugData[]>([]);
  const [allPersonal, setAllPersonal] = useState<UserData[]>([]);
  const [sonderfunktionen, setSonderfunktionen] = useState<
    SonderfunktionData[]
  >([]);
  const [schichtZeiten, setSchichtZeiten] = useState<SchichtKonfiguration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingDienstplan, setLoadingDienstplan] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ----------------------------------------------------------
  // Access check
  // ----------------------------------------------------------

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user || session.user.rolle !== "ADMIN") {
      router.replace("/dienstplan");
    }
  }, [session, sessionStatus, router]);

  // ----------------------------------------------------------
  // Initial data load
  // ----------------------------------------------------------

  const fetchBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [abtRes, fzRes, persRes, sfRes, zeitRes] = await Promise.all([
        fetch("/api/abteilungen"),
        fetch("/api/fahrzeuge"),
        fetch("/api/personal"),
        fetch("/api/sonderfunktionen"),
        fetch("/api/einstellungen"),
      ]);

      if (!abtRes.ok)
        throw new Error("Abteilungen konnten nicht geladen werden");
      if (!fzRes.ok) throw new Error("Fahrzeuge konnten nicht geladen werden");
      if (!persRes.ok) throw new Error("Personal konnte nicht geladen werden");
      if (!sfRes.ok)
        throw new Error("Sonderfunktionen konnten nicht geladen werden");
      if (!zeitRes.ok)
        throw new Error("Einstellungen konnten nicht geladen werden");

      const [abtData, fzData, persData, sfData, zeitData] = await Promise.all([
        abtRes.json(),
        fzRes.json(),
        persRes.json(),
        sfRes.json(),
        zeitRes.json(),
      ]);

      setAbteilungen(abtData);
      setFahrzeuge(fzData);
      setAllPersonal(persData);
      setSonderfunktionen(sfData);
      setSchichtZeiten(zeitData);

      // Set default abteilung if not provided via URL
      if (!selectedAbteilung && abtData.length > 0) {
        const defaultAbt =
          session?.user?.abteilungId || abtData[0].id;
        setSelectedAbteilung(defaultAbt);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.abteilungId, selectedAbteilung]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // ----------------------------------------------------------
  // Update URL when date/abteilung changes
  // ----------------------------------------------------------

  useEffect(() => {
    if (!selectedAbteilung) return;
    const datum = formatDateApi(currentDate);
    const newUrl = `/dienstplan/bearbeiten?datum=${datum}&abteilung=${selectedAbteilung}`;
    router.replace(newUrl, { scroll: false });
  }, [currentDate, selectedAbteilung, router]);

  // ----------------------------------------------------------
  // Load/create dienstplan
  // ----------------------------------------------------------

  const ensureDienstplanExists = useCallback(
    async (datum: string, abteilungId: string) => {
      // Create TAG and NACHT if they don't exist
      await Promise.all([
        fetch("/api/dienstplan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datum, schicht: "TAG", abteilungId }),
        }),
        fetch("/api/dienstplan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datum, schicht: "NACHT", abteilungId }),
        }),
      ]);
    },
    []
  );

  const fetchDienstplan = useCallback(async () => {
    if (!selectedAbteilung) return;

    setLoadingDienstplan(true);
    try {
      const datum = formatDateApi(currentDate);

      // Ensure dienstplan entries exist
      await ensureDienstplanExists(datum, selectedAbteilung);

      // Then fetch
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
  }, [currentDate, selectedAbteilung, ensureDienstplanExists]);

  useEffect(() => {
    if (selectedAbteilung) {
      fetchDienstplan();
    }
  }, [fetchDienstplan, selectedAbteilung]);

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
  // Publish
  // ----------------------------------------------------------

  async function handlePublishBoth() {
    setPublishing(true);
    try {
      const promises = [];
      if (dienstplanData?.tag && !dienstplanData.tag.veroeffentlicht) {
        promises.push(
          fetch("/api/dienstplan/veroeffentlichen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dienstplanId: dienstplanData.tag.id }),
          })
        );
      }
      if (dienstplanData?.nacht && !dienstplanData.nacht.veroeffentlicht) {
        promises.push(
          fetch("/api/dienstplan/veroeffentlichen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dienstplanId: dienstplanData.nacht.id }),
          })
        );
      }

      if (promises.length === 0) {
        toast.info("Beide Schichten sind bereits veroeffentlicht.");
        return;
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Veroeffentlichen");
        }
      }

      toast.success("Dienstplan veroeffentlicht!");
      fetchDienstplan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setPublishing(false);
    }
  }

  // ----------------------------------------------------------
  // Toggle Fahrzeug
  // ----------------------------------------------------------

  async function handleToggleFahrzeug(
    dienstplanId: string,
    fahrzeugId: string,
    aktiv: boolean
  ) {
    try {
      const res = await fetch("/api/dienstplan/tagesfahrzeug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dienstplanId, fahrzeugId, aktiv }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Umschalten");
      }

      toast.success(
        aktiv ? "Fahrzeug aktiviert" : "Fahrzeug deaktiviert"
      );
      fetchDienstplan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (session?.user?.rolle !== "ADMIN") {
    return null;
  }

  const bothPublished =
    (dienstplanData?.tag?.veroeffentlicht ?? false) &&
    (dienstplanData?.nacht?.veroeffentlicht ?? false);
  const anyUnpublished =
    (dienstplanData?.tag && !dienstplanData.tag.veroeffentlicht) ||
    (dienstplanData?.nacht && !dienstplanData.nacht.veroeffentlicht);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(
                `/dienstplan`
              )
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dienstplan bearbeiten
            </h1>
            <p className="text-sm text-slate-500">
              Zuweisungen verwalten und veroeffentlichen
            </p>
          </div>
        </div>

        {/* Publish button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dienstplan")}
          >
            Zurueck zur Ansicht
          </Button>
          {anyUnpublished && (
            <Button
              variant="default"
              onClick={handlePublishBoth}
              disabled={publishing || bothPublished}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Veroeffentlichen
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
          <SchichtEditorSection
            label="Tagschicht"
            zeitraum={getSchichtZeitraum("TAG")}
            schichtTyp="TAG"
            dienstplan={dienstplanData?.tag ?? null}
            fahrzeuge={fahrzeuge}
            allPersonal={allPersonal}
            otherSchichtDienstplan={dienstplanData?.nacht ?? null}
            sonderfunktionen={sonderfunktionen}
            onZuweisungChanged={fetchDienstplan}
            onToggleFahrzeug={handleToggleFahrzeug}
          />

          <Separator />

          {/* Nachtschicht */}
          <SchichtEditorSection
            label="Nachtschicht"
            zeitraum={getSchichtZeitraum("NACHT")}
            schichtTyp="NACHT"
            dienstplan={dienstplanData?.nacht ?? null}
            fahrzeuge={fahrzeuge}
            allPersonal={allPersonal}
            otherSchichtDienstplan={dienstplanData?.tag ?? null}
            sonderfunktionen={sonderfunktionen}
            onZuweisungChanged={fetchDienstplan}
            onToggleFahrzeug={handleToggleFahrzeug}
          />
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Page (Suspense boundary for useSearchParams)
// ----------------------------------------------------------------

export default function DienstplanBearbeitenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <DienstplanBearbeitenInner />
    </Suspense>
  );
}
