import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createZuweisungSchema, deleteZuweisungSchema } from "@/lib/validations";
import { requireRole, darfAbteilung, darfUser } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = createZuweisungSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dienstplanId, userId, fahrzeugPositionId, sonderfunktionId } = parsed.data;

    // Abteilungstrennung: Dienstplan muss zur eigenen Abteilung gehoeren
    const dienstplan = await prisma.dienstplan.findUnique({
      where: { id: dienstplanId },
      select: { abteilungId: true },
    });
    if (!dienstplan) {
      return NextResponse.json({ error: "Dienstplan nicht gefunden" }, { status: 404 });
    }
    if (!darfAbteilung(session, dienstplan.abteilungId)) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diese Wachabteilung" },
        { status: 403 }
      );
    }

    // Abteilungstrennung: der eingeteilte User muss zur eigenen Abteilung
    // gehoeren (Azubis WA-uebergreifend) – kein Cross-WA-Einteilen.
    const zielUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { abteilungId: true, beschaeftigung: true },
    });
    if (!zielUser) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    if (!darfUser(session, zielUser)) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diesen Benutzer" },
        { status: 403 }
      );
    }

    // Azubis bekommen niemals eine Sonderfunktion (Zusatzaufgabe) – erzwingen.
    const effektiveSonderfunktionId =
      zielUser.beschaeftigung === "AZUBI" ? null : sonderfunktionId ?? null;

    // Prüfen ob die Position schon besetzt ist
    const existingPosition = await prisma.zuweisung.findUnique({
      where: {
        dienstplanId_fahrzeugPositionId: {
          dienstplanId,
          fahrzeugPositionId,
        },
      },
    });

    if (existingPosition) {
      // Position ist bereits besetzt -> Update (Person tauschen)
      const zuweisung = await prisma.zuweisung.update({
        where: { id: existingPosition.id },
        data: {
          userId,
          sonderfunktionId: effektiveSonderfunktionId,
        },
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
      });

      return NextResponse.json(zuweisung);
    }

    // Prüfen ob der Benutzer schon in diesem Dienstplan zugewiesen ist
    const existingUser = await prisma.zuweisung.findUnique({
      where: {
        dienstplanId_userId: {
          dienstplanId,
          userId,
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Benutzer ist bereits in diesem Dienstplan eingeteilt" },
        { status: 409 }
      );
    }

    // Neue Zuweisung erstellen
    const zuweisung = await prisma.zuweisung.create({
      data: {
        dienstplanId,
        userId,
        fahrzeugPositionId,
        sonderfunktionId: sonderfunktionId ?? null,
      },
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
    });

    return NextResponse.json(zuweisung, { status: 201 });
  } catch (error) {
    console.error("POST /api/dienstplan/zuweisung error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = deleteZuweisungSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Abteilungstrennung: Zuweisung muss zu einem Dienstplan der eigenen Abteilung gehoeren
    const bestehend = await prisma.zuweisung.findUnique({
      where: { id: parsed.data.zuweisungId },
      select: { dienstplan: { select: { abteilungId: true } } },
    });
    if (!bestehend) {
      return NextResponse.json({ error: "Zuweisung nicht gefunden" }, { status: 404 });
    }
    if (!darfAbteilung(session, bestehend.dienstplan.abteilungId)) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diese Wachabteilung" },
        { status: 403 }
      );
    }

    await prisma.zuweisung.delete({
      where: { id: parsed.data.zuweisungId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json({ error: "Zuweisung nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/dienstplan/zuweisung error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
