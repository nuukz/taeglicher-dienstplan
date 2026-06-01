import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, darfUser } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const userQualis = await prisma.userQualifikation.findMany({
      where: { userId: params.id },
      include: { qualifikation: true },
    });

    return NextResponse.json(userQualis.map((uq) => uq.qualifikation));
  } catch (error) {
    console.error("GET /api/personal/[id]/qualifikationen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    // Abteilungstrennung: nur Benutzer der eigenen Abteilung (Azubis ausgenommen)
    const ziel = await prisma.user.findUnique({
      where: { id: params.id },
      select: { abteilungId: true, beschaeftigung: true },
    });
    if (!ziel) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    if (!darfUser(session, ziel)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Benutzer" }, { status: 403 });
    }

    const body = await request.json();
    const qualifikationIds: unknown = body.qualifikationIds;

    if (
      !Array.isArray(qualifikationIds) ||
      !qualifikationIds.every((q) => typeof q === "string")
    ) {
      return NextResponse.json(
        { error: "qualifikationIds muss ein Array von IDs sein" },
        { status: 400 }
      );
    }

    // Loeschen + Neusetzen atomar, damit bei einem Fehler nicht alle
    // bisherigen Qualifikationen verloren gehen.
    await prisma.$transaction(async (tx) => {
      await tx.userQualifikation.deleteMany({
        where: { userId: params.id },
      });

      if (qualifikationIds.length > 0) {
        await tx.userQualifikation.createMany({
          data: qualifikationIds.map((qId) => ({
            userId: params.id,
            qualifikationId: qId,
          })),
        });
      }
    });

    // Aktualisierte Liste zurueckgeben
    const updated = await prisma.userQualifikation.findMany({
      where: { userId: params.id },
      include: { qualifikation: true },
    });

    return NextResponse.json(updated.map((uq) => uq.qualifikation));
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Foreign key constraint")
    ) {
      return NextResponse.json(
        { error: "Ungueltige Qualifikation oder Benutzer" },
        { status: 400 }
      );
    }
    console.error("PUT /api/personal/[id]/qualifikationen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
