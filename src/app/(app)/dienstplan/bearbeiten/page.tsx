"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerfuegbarkeitEditor } from "@/components/dienstplan/verfuegbarkeit-editor";
import { EinteilenEditor } from "@/components/dienstplan/einteilen-editor";
import { KontrolleVersenden } from "@/components/dienstplan/kontrolle-versenden";
import { MonatsKalender } from "@/components/dienstplan/monats-kalender";
import type {
  UserData,
  FahrzeugData,
  SonderfunktionData,
  SchichtKonfiguration,
  DienstplanResponse,
  AbwesenheitData,
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
// Inner Page
// ----------------------------------------------------------------

function DienstplanBearbeitenInner() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDatum = searchParams.get("datum");

  const [currentDate, setCurrentDate] = useState<Date>(
    initialDatum ? parseDateString(initialDatum) : new Date()
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [allPersonal, setAllPersonal] = useState<UserData[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<FahrzeugData[]>([]);
  const [sonderfunktionen, setSonderfunktionen] = useState<SonderfunktionData[]>([]);
  const [schichtZeiten, setSchichtZeiten] = useState<SchichtKonfiguration[]>([]);
  const [abteilungName, setAbteilungName] = useState<string>("");
  const [dienstplanData, setDienstplanData] = useState<DienstplanResponse | null>(null);
  const [abwesenheiten, setAbwesenheiten] = useState<AbwesenheitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDienstplan, setLoadingDienstplan] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

  const isSysop = session?.user?.rolle === "SYSOP";
  const waParam = searchParams.get("wa");
  // SYSOP darf jede Abteilung bearbeiten (?wa=...), alle anderen nur die eigene
  const abteilungId =
    isSysop && waParam ? waParam : session?.user?.abteilungId;

  const [abteilungen, setAbteilungen] = useState<{ id: string; name: string }[]>([]);

  // Access check
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user || session.user.rolle === "KOLLEGE") {
      router.replace("/dienstplan");
    }
  }, [session, sessionStatus, router]);

  // URL aktualisieren (wa-Auswahl des SYSOP erhalten)
  useEffect(() => {
    if (!abteilungId) return;
    const datum = formatDateApi(currentDate);
    const waSuffix = isSysop && waParam ? `&wa=${waParam}` : "";
    router.replace(`/dienstplan/bearbeiten?datum=${datum}${waSuffix}`, {
      scroll: false,
    });
  }, [currentDate, abteilungId, router, isSysop, waParam]);

  // Stammdaten laden
  const fetchBaseData = useCallback(async () => {
    if (!abteilungId) return;
    setLoading(true);
    try {
      const [fzRes, persRes, sfRes, zeitRes, abtRes] = await Promise.all([
        fetch("/api/fahrzeuge"),
        fetch(`/api/personal?abteilung=${abteilungId}`),
        fetch("/api/sonderfunktionen"),
        fetch("/api/einstellungen"),
        fetch("/api/abteilungen"),
      ]);

      if (!fzRes.ok || !persRes.ok || !sfRes.ok || !zeitRes.ok) {
        throw new Error("Stammdaten konnten nicht geladen werden");
      }

      const [fzData, persData, sfData, zeitData, abtData] = await Promise.all([
        fzRes.json(),
        persRes.json(),
        sfRes.json(),
        zeitRes.json(),
        abtRes.ok ? abtRes.json() : [],
      ]);

      setFahrzeuge(fzData);
      setAllPersonal(persData);
      setSonderfunktionen(sfData);
      setSchichtZeiten(zeitData);

      setAbteilungen(abtData);
      if (abtData.length > 0 && abteilungId) {
        const abt = abtData.find((a: { id: string; name: string }) => a.id === abteilungId);
        if (abt) setAbteilungName(abt.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [abteilungId]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // Dienstplan + Abwesenheiten laden
  const fetchDienstplan = useCallback(async () => {
    if (!abteilungId) return;
    setLoadingDienstplan(true);
    try {
      const datum = formatDateApi(currentDate);

      // Dienstplan sicherstellen
      const ensureRes = await Promise.all([
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
      if (ensureRes.some((r) => !r.ok)) {
        throw new Error("Dienstplan konnte nicht angelegt werden");
      }

      // Parallel laden
      const [dpRes, abwRes] = await Promise.all([
        fetch(`/api/dienstplan?datum=${datum}&abteilungId=${abteilungId}`),
        fetch(`/api/abwesenheit?datum=${datum}&abteilungId=${abteilungId}`),
      ]);

      if (!dpRes.ok) throw new Error("Dienstplan konnte nicht geladen werden");

      const dpData: DienstplanResponse = await dpRes.json();
      setDienstplanData(dpData);

      if (abwRes.ok) {
        setAbwesenheiten(await abwRes.json());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoadingDienstplan(false);
    }
  }, [currentDate, abteilungId]);

  useEffect(() => {
    if (abteilungId) fetchDienstplan();
  }, [fetchDienstplan, abteilungId]);

  // Date navigation
  function goToPreviousDay() {
    setCurrentDate((d) => addDays(d, -1));
    setStep(1);
  }
  function goToNextDay() {
    setCurrentDate((d) => addDays(d, 1));
    setStep(1);
  }
  function goToToday() {
    setCurrentDate(new Date());
    setStep(1);
  }

  // Publish
  async function handlePublish() {
    setPublishing(true);
    try {
      const promises = [];
      if (dienstplanData?.tag) {
        promises.push(
          fetch("/api/dienstplan/veroeffentlichen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dienstplanId: dienstplanData.tag.id }),
          })
        );
      }
      if (dienstplanData?.nacht) {
        promises.push(
          fetch("/api/dienstplan/veroeffentlichen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dienstplanId: dienstplanData.nacht.id }),
          })
        );
      }
      if (promises.length === 0) {
        toast.info("Kein Dienstplan zum Veroeffentlichen vorhanden.");
        return;
      }
      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Fehler beim Veroeffentlichen");
        }
      }

      const isUpdate = dienstplanData?.tag?.veroeffentlicht || dienstplanData?.nacht?.veroeffentlicht;
      toast.success(isUpdate ? "Dienstplan aktualisiert & gesendet!" : "Dienstplan veroeffentlicht!");
      fetchDienstplan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setPublishing(false);
    }
  }

  // Verfuegbare Kollegen (aktiv & nicht abwesend)
  const abwesenheitUserIds = new Set(abwesenheiten.map((a) => a.userId));
  const verfuegbareKollegen = allPersonal.filter(
    (u) => u.aktiv && !abwesenheitUserIds.has(u.id)
  );

  // Render
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (session?.user?.rolle !== "ADMIN" && session?.user?.rolle !== "SYSOP") return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dienstplan")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Dienstplan bearbeiten
          </h1>
          <p className="text-xs text-slate-500">
            Wachabteilung {abteilungName}
          </p>
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
                onClick={() =>
                  router.replace(
                    `/dienstplan/bearbeiten?datum=${formatDateApi(
                      currentDate
                    )}&wa=${a.id}`,
                    { scroll: false }
                  )
                }
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  abteilungId === a.id
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

        {/* Stepper Indicator */}
        <div className="ml-auto flex items-center gap-1">
          {[1, 2, 3].map((n, i) => (
            <div key={n} className="flex items-center gap-1">
              {i > 0 && <div className="w-5 h-0.5 bg-slate-200" />}
              <div
                className={`flex items-center justify-center rounded-full size-6 text-xs font-bold ${
                  step === n
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {n}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monatskalender */}
      {showCalendar && (
        <MonatsKalender
          currentDate={currentDate}
          abteilungName={abteilungName}
          abteilungId={abteilungId}
          calendarMonth={calendarMonth}
          onDateSelect={(date) => {
            setCurrentDate(date);
            setStep(1);
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
      ) : step === 1 ? (
        <VerfuegbarkeitEditor
          personal={allPersonal}
          abwesenheiten={abwesenheiten}
          datum={formatDateApi(currentDate)}
          onAbwesenheitChanged={fetchDienstplan}
          onWeiter={() => setStep(2)}
        />
      ) : step === 2 ? (
        <EinteilenEditor
          verfuegbareKollegen={verfuegbareKollegen}
          fahrzeuge={fahrzeuge}
          tagDienstplan={dienstplanData?.tag ?? null}
          nachtDienstplan={dienstplanData?.nacht ?? null}
          sonderfunktionen={sonderfunktionen}
          schichtZeiten={schichtZeiten}
          onZuweisungChanged={fetchDienstplan}
          onZurueck={() => setStep(1)}
          publishing={publishing}
          onPublish={() => setStep(3)}
        />
      ) : (
        <KontrolleVersenden
          datum={formatDateApi(currentDate)}
          abteilungName={abteilungName}
          tagDienstplan={dienstplanData?.tag ?? null}
          nachtDienstplan={dienstplanData?.nacht ?? null}
          fahrzeuge={fahrzeuge}
          schichtZeiten={schichtZeiten}
          publishing={publishing}
          onZurueck={() => setStep(2)}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Page
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
