import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createDienstplanSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datum = searchParams.get("datum");
    const abteilungId = searchParams.get("abteilungId");

    if (!datum || !abteilungId) {
      return NextResponse.json(
        { error: "Parameter 'datum' und 'abteilungId' sind erforderlich" },
        { status: 400 }
      );
    }

    // Datum als Date-Objekt parsen (nur Datumsanteil)
    const datumDate = new Date(datum + "T00:00:00.000Z");

    // Beide Schichten laden
    const dienstplaene = await prisma.dienstplan.findMany({
      where: {
        datum: datumDate,
        abteilungId,
      },
      include: {
        zuweisungen: {
          include: {
            user: {
              select: {
                id: true,
                vorname: true,
                nachname: true,
                email: true,
                rolle: true,
                beschaeftigung: true,
                aktiv: true,
                abteilungId: true,
              },
            },
            fahrzeugPosition: {
              include: {
                fahrzeug: true,
              },
            },
            sonderfunktion: true,
          },
        },
        tagesFahrzeuge: {
          include: {
            fahrzeug: true,
          },
        },
        aenderungen: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Strukturiertes Ergebnis mit TAG und NACHT
    const tag = dienstplaene.find((d) => d.schicht === "TAG") || null;
    const nacht = dienstplaene.find((d) => d.schicht === "NACHT") || null;

    return NextResponse.json({
      datum,
      abteilungId,
      tag,
      nacht,
    });
  } catch (error) {
    console.error("GET /api/dienstplan error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    if (session.user.rolle !== "ADMIN") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDienstplanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { datum, schicht, abteilungId } = parsed.data;
    const datumDate = new Date(datum + "T00:00:00.000Z");

    // Bestehenden Dienstplan suchen oder neuen erstellen
    const dienstplan = await prisma.dienstplan.upsert({
      where: {
        datum_schicht_abteilungId: {
          datum: datumDate,
          schicht,
          abteilungId,
        },
      },
      update: {},
      create: {
        datum: datumDate,
        schicht,
        abteilungId,
      },
      include: {
        zuweisungen: {
          include: {
            user: {
              select: {
                id: true,
                vorname: true,
                nachname: true,
                email: true,
                rolle: true,
                beschaeftigung: true,
                aktiv: true,
                abteilungId: true,
              },
            },
            fahrzeugPosition: {
              include: {
                fahrzeug: true,
              },
            },
            sonderfunktion: true,
          },
        },
        tagesFahrzeuge: {
          include: {
            fahrzeug: true,
          },
        },
      },
    });

    return NextResponse.json(dienstplan, { status: 201 });
  } catch (error) {
    console.error("POST /api/dienstplan error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
