import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createPositionSchema, deletePositionSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const { id: fahrzeugId } = await params;
    const body = await request.json();
    const parsed = createPositionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Prüfen ob Fahrzeug existiert
    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: fahrzeugId },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
    }

    const { requiredQualifikationIds, ...posData } = parsed.data;

    const position = await prisma.fahrzeugPosition.create({
      data: {
        ...posData,
        fahrzeugId,
        ...(requiredQualifikationIds && requiredQualifikationIds.length > 0
          ? {
              requiredQualifikationen: {
                create: requiredQualifikationIds.map((qId: string) => ({
                  qualifikationId: qId,
                })),
              },
            }
          : {}),
      },
      include: {
        requiredQualifikationen: {
          include: { qualifikation: true },
        },
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Position mit diesem Namen existiert bereits für dieses Fahrzeug" },
        { status: 409 }
      );
    }
    console.error("POST /api/fahrzeuge/[id]/positionen error:", error);
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

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const { id: fahrzeugId } = await params;
    const body = await request.json();
    const parsed = deletePositionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Sicherstellen, dass die Position zum Fahrzeug gehört
    const position = await prisma.fahrzeugPosition.findFirst({
      where: {
        id: parsed.data.positionId,
        fahrzeugId,
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "Position nicht gefunden oder gehört nicht zu diesem Fahrzeug" },
        { status: 404 }
      );
    }

    await prisma.fahrzeugPosition.delete({
      where: { id: parsed.data.positionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fahrzeuge/[id]/positionen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
