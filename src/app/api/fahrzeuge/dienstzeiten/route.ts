import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateFahrzeugDienstzeitSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

// Standard-Wochenvorlage der Fahrzeuge (global, SYSOP-verwaltet).
// GET: lesbar fuer alle Angemeldeten. PUT: nur SYSOP.

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const fahrzeuge = await prisma.fahrzeug.findMany({
      orderBy: { reihenfolge: "asc" },
      select: {
        id: true,
        name: true,
        typ: true,
        aktiv: true,
        reihenfolge: true,
        parentFahrzeugId: true,
        dienstzeiten: {
          select: { wochentag: true, schicht: true, imDienst: true },
        },
      },
    });

    return NextResponse.json(fahrzeuge);
  } catch (error) {
    console.error("GET /api/fahrzeuge/dienstzeiten error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requireRole(session, "SYSOP");
    if (denied) return denied;

    const body = await request.json();
    const parsed = updateFahrzeugDienstzeitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fahrzeugId, eintraege } = parsed.data;

    // Fahrzeug muss existieren
    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: fahrzeugId },
      select: { id: true },
    });
    if (!fahrzeug) {
      return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
    }

    // Vollersatz: erst alle bestehenden Eintraege des Fahrzeugs loeschen, dann neu
    // schreiben. So bleiben keine alten "Leichen" stehen (echter Ersatz statt Teil-Update).
    await prisma.$transaction([
      prisma.fahrzeugDienstzeit.deleteMany({ where: { fahrzeugId } }),
      prisma.fahrzeugDienstzeit.createMany({
        data: eintraege.map((e) => ({
          fahrzeugId,
          wochentag: e.wochentag,
          schicht: e.schicht,
          imDienst: e.imDienst,
        })),
      }),
    ]);

    const dienstzeiten = await prisma.fahrzeugDienstzeit.findMany({
      where: { fahrzeugId },
      select: { wochentag: true, schicht: true, imDienst: true },
    });

    return NextResponse.json(dienstzeiten);
  } catch (error) {
    console.error("PUT /api/fahrzeuge/dienstzeiten error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
