import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createVertretungSchema } from "@/lib/validations";
import { requireRole, requireAbteilung } from "@/lib/permissions";

// Tagesvertretung anlegen: eine Aushilfe nur fuer ein bestimmtes Datum.
// Wird als regulaerer (nicht einloggbarer) User mit vertretungFuerDatum erstellt.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = createVertretungSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { vorname, nachname, datum, abteilungId, qualifikationIds } = parsed.data;

    // Abteilungstrennung: nur fuer die eigene Abteilung anlegen (ausser SYSOP)
    const abtDenied = requireAbteilung(session, abteilungId);
    if (abtDenied) return abtDenied;

    const datumDate = new Date(datum + "T00:00:00.000Z");
    // Nicht einloggbarer Platzhalter-Account
    const email = `vertretung-${randomUUID()}@local.invalid`;
    const passwortHash = await hash(randomUUID(), 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwortHash,
        vorname,
        nachname,
        rolle: "KOLLEGE",
        beschaeftigung: "ANGESTELLTER",
        abteilungId,
        aktiv: true,
        vertretungFuerDatum: datumDate,
        ...(qualifikationIds && qualifikationIds.length > 0
          ? {
              qualifikationen: {
                create: qualifikationIds.map((qId) => ({
                  qualifikationId: qId,
                })),
              },
            }
          : {}),
      },
      include: {
        abteilung: true,
        qualifikationen: { include: { qualifikation: true } },
      },
    });

    const { passwortHash: _ph, ...sanitized } = user;
    return NextResponse.json(sanitized, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Foreign key constraint")) {
      return NextResponse.json({ error: "Ungültige Qualifikation" }, { status: 400 });
    }
    console.error("POST /api/personal/vertretung error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
