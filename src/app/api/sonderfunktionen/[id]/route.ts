import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateSonderfunktionSchema } from "@/lib/validations";
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
    const parsed = updateSonderfunktionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sonderfunktion = await prisma.sonderfunktion.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(sonderfunktion);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Sonderfunktion nicht gefunden" }, { status: 404 });
    }
    console.error("PATCH /api/sonderfunktionen/[id] error:", error);
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

    const sonderfunktion = await prisma.sonderfunktion.update({
      where: { id },
      data: { aktiv: false },
    });

    return NextResponse.json(sonderfunktion);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Sonderfunktion nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/sonderfunktionen/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
