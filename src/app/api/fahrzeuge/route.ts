import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createFahrzeugSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const fahrzeuge = await prisma.fahrzeug.findMany({
      include: {
        positionen: {
          orderBy: { reihenfolge: "asc" },
          include: {
            requiredQualifikationen: {
              include: { qualifikation: true },
            },
          },
        },
        dienstzeiten: {
          select: { wochentag: true, schicht: true, imDienst: true },
        },
      },
      orderBy: { reihenfolge: "asc" },
    });

    return NextResponse.json(fahrzeuge);
  } catch (error) {
    console.error("GET /api/fahrzeuge error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "SYSOP");
    if (denied) return denied;

    const body = await request.json();
    const parsed = createFahrzeugSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { anzahlPlaetze, ...fahrzeugData } = parsed.data;

    const fahrzeug = await prisma.fahrzeug.create({
      data: {
        ...fahrzeugData,
        ...(anzahlPlaetze && anzahlPlaetze > 0
          ? {
              positionen: {
                create: Array.from({ length: anzahlPlaetze }, (_, i) => ({
                  name: `Platz ${i + 1}`,
                  reihenfolge: i + 1,
                })),
              },
            }
          : {}),
      },
      include: {
        positionen: true,
      },
    });

    return NextResponse.json(fahrzeug, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Fahrzeugname wird bereits verwendet" },
        { status: 409 }
      );
    }
    console.error("POST /api/fahrzeuge error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
