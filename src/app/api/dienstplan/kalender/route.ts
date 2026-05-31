import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Leichtgewichtiger Endpunkt: Welche Tage haben Dienstpläne?
// GET /api/dienstplan/kalender?von=2026-04-01&bis=2026-06-30&abteilungId=xxx

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const von = searchParams.get("von");
    const bis = searchParams.get("bis");
    const abteilungId = searchParams.get("abteilungId");

    if (!von || !bis || !abteilungId) {
      return NextResponse.json(
        { error: "Parameter 'von', 'bis' und 'abteilungId' sind erforderlich" },
        { status: 400 }
      );
    }

    const vonDate = new Date(von + "T00:00:00.000Z");
    const bisDate = new Date(bis + "T00:00:00.000Z");

    const dienstplaene = await prisma.dienstplan.findMany({
      where: {
        abteilungId,
        datum: {
          gte: vonDate,
          lte: bisDate,
        },
      },
      select: {
        datum: true,
        schicht: true,
        veroeffentlicht: true,
        version: true,
        _count: {
          select: { zuweisungen: true },
        },
      },
    });

    // Gruppiert nach Datum
    const result: Record<string, {
      tag?: { veroeffentlicht: boolean; version: number; zuweisungen: number };
      nacht?: { veroeffentlicht: boolean; version: number; zuweisungen: number };
    }> = {};

    for (const dp of dienstplaene) {
      const key = dp.datum.toISOString().split("T")[0];
      if (!result[key]) result[key] = {};

      const entry = {
        veroeffentlicht: dp.veroeffentlicht,
        version: dp.version,
        zuweisungen: dp._count.zuweisungen,
      };

      if (dp.schicht === "TAG") {
        result[key].tag = entry;
      } else {
        result[key].nacht = entry;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/dienstplan/kalender error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
