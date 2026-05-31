"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ----------------------------------------------------------------
// Dienstrhythmus: 21-Tage-Zyklus (3 Wochen)
// Wochenmuster einer WA: Mo, Fr, So, Mi, Sa, Di, Do
// Die anderen WAs fuellen die Tage dazwischen.
// Referenz-Montag: 01.06.2026 = Start mit WA 2
// ----------------------------------------------------------------

const REFERENCE_MONDAY = new Date(2026, 5, 1); // 1. Juni 2026 (Montag)
const WA_NAMES = ["1", "2", "3"];

// Basis-Wochenmuster (Mo-So) als WA-Indizes fuer Woche 0:
// Mo=WA2(1), Di=WA1(0), Mi=WA3(2), Do=WA1(0), Fr=WA2(1), Sa=WA3(2), So=WA2(1)
const BASE_PATTERN = [1, 0, 2, 0, 1, 2, 1];

function getWAIndex(date: Date): number {
  const ref = new Date(REFERENCE_MONDAY);
  ref.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - ref.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  // Wochentag (0=Mo, 6=So)
  const dayOfWeek = ((diffDays % 7) + 7) % 7;
  // Wochen-Offset im 3-Wochen-Zyklus
  const weekOffset = ((Math.floor(diffDays / 7) % 3) + 3) % 3;
  return (BASE_PATTERN[dayOfWeek] - weekOffset + 3) % 3;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface DienstplanStatus {
  tag?: { veroeffentlicht: boolean; version: number; zuweisungen: number };
  nacht?: { veroeffentlicht: boolean; version: number; zuweisungen: number };
}

type KalenderData = Record<string, DienstplanStatus>;

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

interface MonatsKalenderProps {
  currentDate: Date;
  abteilungName: string;
  abteilungId?: string;
  onDateSelect: (date: Date) => void;
  onMonthChange: (offset: number) => void;
  calendarMonth: Date;
}

export function MonatsKalender({
  currentDate,
  abteilungName,
  abteilungId,
  onDateSelect,
  onMonthChange,
  calendarMonth,
}: MonatsKalenderProps) {
  const centerYear = calendarMonth.getFullYear();
  const centerMonth = calendarMonth.getMonth();
  const myWAIndex = WA_NAMES.indexOf(abteilungName);

  const [kalenderData, setKalenderData] = useState<KalenderData>({});

  // Berechne den Datumsbereich fuer die 3 Monate
  const prevMonth = centerMonth === 0 ? 11 : centerMonth - 1;
  const prevYear = centerMonth === 0 ? centerYear - 1 : centerYear;
  const nextMonth = centerMonth === 11 ? 0 : centerMonth + 1;
  const nextYear = centerMonth === 11 ? centerYear + 1 : centerYear;

  const months = [
    { year: prevYear, month: prevMonth },
    { year: centerYear, month: centerMonth },
    { year: nextYear, month: nextMonth },
  ];

  // Dienstplan-Status fuer den sichtbaren Bereich laden
  const fetchKalenderData = useCallback(async () => {
    if (!abteilungId) return;

    const von = formatDateKey(prevYear, prevMonth, 1);
    const bisDay = getDaysInMonth(nextYear, nextMonth);
    const bis = formatDateKey(nextYear, nextMonth, bisDay);

    try {
      const res = await fetch(
        `/api/dienstplan/kalender?von=${von}&bis=${bis}&abteilungId=${abteilungId}`
      );
      if (res.ok) {
        setKalenderData(await res.json());
      }
    } catch {
      // Stille Fehlerbehandlung - Kalender funktioniert auch ohne Status
    }
  }, [abteilungId, prevYear, prevMonth, nextYear, nextMonth]);

  useEffect(() => {
    fetchKalenderData();
  }, [fetchKalenderData]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMonthChange(-1)}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            {MONATE[centerMonth]} {centerYear}
          </h3>
          <p className="text-[10px] text-white/50">
            Dienstrhythmus WA {abteilungName}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMonthChange(1)}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* 3 Months */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {months.map(({ year, month }, idx) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            isCenter={idx === 1}
            today={today}
            currentDate={currentDate}
            myWAIndex={myWAIndex}
            kalenderData={kalenderData}
            onDateSelect={onDateSelect}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          <span className="text-[11px] font-medium text-slate-600">Dein Dienst</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative inline-flex items-center justify-center size-5 rounded bg-emerald-100">
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] text-slate-500">Plan erstellt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative inline-flex items-center justify-center size-5 rounded bg-emerald-100">
            <svg className="size-2.5 text-emerald-600" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6l3 3 5-5" />
            </svg>
          </span>
          <span className="text-[11px] text-slate-500">Veroeffentlicht</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-red-400 ring-2 ring-red-100" />
          <span className="text-[11px] text-slate-400">Heute</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Single Month Grid
// ----------------------------------------------------------------

function MonthGrid({
  year,
  month,
  isCenter,
  today,
  currentDate,
  myWAIndex,
  kalenderData,
  onDateSelect,
}: {
  year: number;
  month: number;
  isCenter: boolean;
  today: Date;
  currentDate: Date;
  myWAIndex: number;
  kalenderData: KalenderData;
  onDateSelect: (date: Date) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`p-3 ${isCenter ? "bg-white" : ""}`}>
      {/* Month name */}
      <h4 className={`text-center text-xs font-semibold mb-2 pb-1.5 border-b ${
        isCenter
          ? "text-slate-900 border-slate-200"
          : "text-slate-400 border-slate-100"
      }`}>
        {MONATE[month]}
      </h4>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WOCHENTAGE.map((tag, i) => (
          <div
            key={tag}
            className={`text-center text-[10px] font-semibold py-1 ${
              i >= 5 ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {tag}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const date = new Date(year, month, day);
          const waIndex = getWAIndex(date);
          const isMyDuty = waIndex === myWAIndex && myWAIndex >= 0;
          const isToday = date.getTime() === today.getTime();
          const isSelected =
            date.getFullYear() === currentDate.getFullYear() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getDate() === currentDate.getDate();
          const isWeekend = (firstDay + day - 1) % 7 >= 5;

          // Dienstplan-Status fuer diesen Tag
          const dateKey = formatDateKey(year, month, day);
          const dpStatus = kalenderData[dateKey];
          const hasAnyPlan = !!(dpStatus?.tag || dpStatus?.nacht);
          const anyPublished = !!(dpStatus?.tag?.veroeffentlicht || dpStatus?.nacht?.veroeffentlicht);
          const hasZuweisungen = (dpStatus?.tag?.zuweisungen ?? 0) + (dpStatus?.nacht?.zuweisungen ?? 0) > 0;

          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square w-full rounded-lg text-[11px] font-medium
                transition-all duration-150 relative flex items-center justify-center
                ${isSelected
                  ? "bg-slate-900 text-white shadow-md scale-110 z-10"
                  : isToday && isMyDuty
                  ? "bg-emerald-500 text-white ring-2 ring-red-400 ring-offset-1"
                  : isToday
                  ? "bg-red-400 text-white ring-2 ring-red-200"
                  : isMyDuty
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:shadow-sm font-semibold"
                  : isWeekend
                  ? "text-slate-300 hover:bg-slate-100"
                  : "text-slate-400 hover:bg-slate-100"
                }
              `}
              title={`${day}. ${MONATE[month]} – WA ${WA_NAMES[waIndex]}${hasAnyPlan ? (anyPublished ? " (veroeffentlicht)" : " (Entwurf)") : ""}`}
            >
              {day}

              {/* Status-Indikator */}
              {!isSelected && hasAnyPlan && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center justify-center ${
                  isToday ? "text-white" : anyPublished ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {anyPublished ? (
                    <svg className="size-2" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  ) : hasZuweisungen ? (
                    <span className={`size-1.5 rounded-full ${isToday ? "bg-white/70" : "bg-amber-400"}`} />
                  ) : (
                    <span className={`size-1 rounded-full ${isToday ? "bg-white/50" : "bg-slate-300"}`} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
