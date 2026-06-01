import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAbwesenheitSchema, deleteAbwesenheitSchema } from "@/lib/validations";
import { requireRole, requireAbteilung, darfUser } from "@/lib/permissions";

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

    const datumDate = new Date(datum + "T00:00:00.000Z");

    const abwesenheiten = await prisma.abwesenheit.findMany({
      where: {
        datum: datumDate,
        user: {
          OR: [
            { abteilungId },
            { beschaeftigung: "AZUBI" },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
          },
        },
      },
    });

    return NextResponse.json(abwesenheiten);
  } catch (error) {
    console.error("GET /api/abwesenheit error:", error);
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
    const parsed = createAbwesenheitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, datum, schicht, grund, notiz } = parsed.data;

    // Abteilungstrennung: Ziel-User muss zur eigenen Abteilung gehoeren (Azubis ausgenommen)
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

    const datumDate = new Date(datum + "T00:00:00.000Z");
    const schichtVal = schicht ?? null;

    // Prüfen ob bereits vorhanden
    const existing = await prisma.abwesenheit.findFirst({
      where: {
        userId,
        datum: datumDate,
        schicht: schichtVal,
      },
    });

    let abwesenheit;
    if (existing) {
      abwesenheit = await prisma.abwesenheit.update({
        where: { id: existing.id },
        data: { grund, notiz: notiz ?? null },
      });
    } else {
      try {
        abwesenheit = await prisma.abwesenheit.create({
          data: {
            userId,
            datum: datumDate,
            schicht: schichtVal,
            grund,
            notiz: notiz ?? null,
          },
        });
      } catch (err: unknown) {
        // Race Condition: paralleler Request hat den Eintrag bereits angelegt
        // (Unique-Constraint userId+datum+schicht) -> stattdessen aktualisieren.
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          const concurrent = await prisma.abwesenheit.findFirst({
            where: { userId, datum: datumDate, schicht: schichtVal },
          });
          if (concurrent) {
            abwesenheit = await prisma.abwesenheit.update({
              where: { id: concurrent.id },
              data: { grund, notiz: notiz ?? null },
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json(abwesenheit, { status: 201 });
  } catch (error) {
    console.error("POST /api/abwesenheit error:", error);
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
    const parsed = deleteAbwesenheitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, datum, schicht } = parsed.data;

    // Abteilungstrennung: Ziel-User muss zur eigenen Abteilung gehoeren (Azubis ausgenommen)
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

    const datumDate = new Date(datum + "T00:00:00.000Z");
    const schichtVal = schicht ?? null;

    const existing = await prisma.abwesenheit.findFirst({
      where: {
        userId,
        datum: datumDate,
        schicht: schichtVal,
      },
    });

    if (existing) {
      await prisma.abwesenheit.delete({
        where: { id: existing.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/abwesenheit error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
