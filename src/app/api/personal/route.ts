import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { createUserSchema } from "@/lib/validations";
import { requireRole, getAbteilungScope, isSysop } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    // Abteilungstrennung wird serverseitig erzwungen, nicht aus der Query uebernommen:
    // SYSOP sieht alle, alle anderen nur die eigene Abteilung + (WA-uebergreifende) Azubis.
    const scope = getAbteilungScope(session.user);

    // Tagesvertretungen (vertretungFuerDatum) erscheinen nur an ihrem Datum.
    // Ohne datum-Param werden sie ganz ausgeblendet (z.B. auf der Personal-Seite).
    const datumParam = new URL(request.url).searchParams.get("datum");
    const datumDate = datumParam
      ? new Date(datumParam + "T00:00:00.000Z")
      : null;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          scope
            ? {
                OR: [
                  { abteilungId: scope },
                  { beschaeftigung: "AZUBI" },
                ],
              }
            : {},
          { rolle: { not: "SYSOP" } },
          {
            OR: [
              { vertretungFuerDatum: null },
              ...(datumDate ? [{ vertretungFuerDatum: datumDate }] : []),
            ],
          },
        ],
      },
      include: {
        abteilung: true,
        qualifikationen: {
          include: {
            qualifikation: true,
          },
        },
      },
      orderBy: {
        nachname: "asc",
      },
    });

    // Passwort-Hash nie an den Client senden
    const sanitized = users.map(({ passwortHash: _passwortHash, ...user }) => user);

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("GET /api/personal error:", error);
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
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { passwort, ...data } = parsed.data;

    // Abteilungstrennung: ADMIN darf nur fuer die eigene Abteilung anlegen
    if (!isSysop(session.user.rolle) && data.abteilungId !== session.user.abteilungId) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diese Wachabteilung" },
        { status: 403 }
      );
    }
    // Rollen-Eskalation: nur SYSOP darf SYSOP-Rollen vergeben
    if (data.rolle === "SYSOP" && !isSysop(session.user.rolle)) {
      return NextResponse.json(
        { error: "Keine Berechtigung fuer diese Rolle" },
        { status: 403 }
      );
    }

    const passwortHash = await hash(passwort, 12);

    const user = await prisma.user.create({
      data: {
        ...data,
        passwortHash,
      },
      include: {
        abteilung: true,
      },
    });

    const { passwortHash: _passwortHash, ...sanitized } = user;

    return NextResponse.json(sanitized, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "E-Mail-Adresse wird bereits verwendet" },
        { status: 409 }
      );
    }
    console.error("POST /api/personal error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
