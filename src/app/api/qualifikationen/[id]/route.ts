import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateQualifikationSchema } from "@/lib/validations";
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
    const parsed = updateQualifikationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const qualifikation = await prisma.qualifikation.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(qualifikation);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Kuerzel existiert bereits" },
        { status: 409 }
      );
    }
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Qualifikation nicht gefunden" }, { status: 404 });
    }
    console.error("PATCH /api/qualifikationen/[id] error:", error);
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

    // Cascade im Schema: UserQualifikation und PositionQualifikation
    // haben onDelete: Cascade auf qualifikationId → werden automatisch geloescht
    await prisma.qualifikation.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json({ error: "Qualifikation nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/qualifikationen/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
