import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateAbteilungSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "SYSOP");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateAbteilungSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const abteilung = await prisma.abteilung.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(abteilung);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Name existiert bereits" },
        { status: 409 }
      );
    }
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Abteilung nicht gefunden" }, { status: 404 });
    }
    console.error("PATCH /api/abteilungen/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "SYSOP");
    if (denied) return denied;

    const { id } = await params;

    // Pruefen ob noch User in der Abteilung sind
    const userCount = await prisma.user.count({
      where: { abteilungId: id },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Abteilung kann nicht geloescht werden: ${userCount} User zugeordnet` },
        { status: 409 }
      );
    }

    // Pruefen ob noch Dienstplaene existieren
    const dienstplanCount = await prisma.dienstplan.count({
      where: { abteilungId: id },
    });

    if (dienstplanCount > 0) {
      return NextResponse.json(
        { error: `Abteilung kann nicht geloescht werden: ${dienstplanCount} Dienstplaene vorhanden` },
        { status: 409 }
      );
    }

    await prisma.abteilung.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json({ error: "Abteilung nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/abteilungen/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
