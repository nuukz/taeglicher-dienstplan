import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createDienstplanSchema } from "@/lib/validations";
import { requireRole, requireAbteilung } from "@/lib/permissions";

// Gemeinsamer Include-Block fuer das vollstaendige Dienstplan-Objekt
const dienstplanInclude = {
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
          requiredQualifikationen: {
            include: { qualifikation: true },
          },
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
} satisfies Prisma.DienstplanInclude;

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

    // Abteilungstrennung: nur eigene Abteilung (ausser SYSOP)
    const denied = requireAbteilung(session, abteilungId);
    if (denied) return denied;

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
                requiredQualifikationen: {
                  include: { qualifikation: true },
                },
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
          include: {
            user: {
              select: { vorname: true, nachname: true },
            },
          },
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

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = createDienstplanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { datum, schicht, abteilungId } = parsed.data;

    // Abteilungstrennung: ADMIN darf nur fuer die eigene Abteilung anlegen
    const abteilungDenied = requireAbteilung(session, abteilungId);
    if (abteilungDenied) return abteilungDenied;

    const datumDate = new Date(datum + "T00:00:00.000Z");

    // Bereits vorhandenen Dienstplan einfach zurueckgeben (keine Vorlage erneut anwenden,
    // damit manuelle Fahrzeug-Overrides nicht ueberschrieben werden).
    const vorhanden = await prisma.dienstplan.findUnique({
      where: {
        datum_schicht_abteilungId: { datum: datumDate, schicht, abteilungId },
      },
      include: dienstplanInclude,
    });
    if (vorhanden) {
      return NextResponse.json(vorhanden);
    }

    // Neu anlegen: Wochenvorlage anwenden - Fahrzeuge, die an diesem Wochentag in
    // dieser Schicht laut Vorlage NICHT im Dienst sind, als inaktiv vorbelegen.
    const wochentag = (datumDate.getUTCDay() + 6) % 7; // 0 = Montag ... 6 = Sonntag
    const nichtImDienst = await prisma.fahrzeugDienstzeit.findMany({
      where: { wochentag, schicht, imDienst: false },
      select: { fahrzeugId: true },
    });

    try {
      const dienstplan = await prisma.dienstplan.create({
        data: {
          datum: datumDate,
          schicht,
          abteilungId,
          ...(nichtImDienst.length > 0 && {
            tagesFahrzeuge: {
              create: nichtImDienst.map((f) => ({
                fahrzeugId: f.fahrzeugId,
                aktiv: false,
              })),
            },
          }),
        },
        include: dienstplanInclude,
      });
      return NextResponse.json(dienstplan, { status: 201 });
    } catch (err: unknown) {
      // Race Condition: paralleler Request hat den Dienstplan schon angelegt
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        const dp = await prisma.dienstplan.findUnique({
          where: {
            datum_schicht_abteilungId: { datum: datumDate, schicht, abteilungId },
          },
          include: dienstplanInclude,
        });
        if (dp) return NextResponse.json(dp);
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /api/dienstplan error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
