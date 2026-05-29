import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateFahrzeugSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;

    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id },
      include: {
        positionen: {
          orderBy: { reihenfolge: "asc" },
        },
      },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(fahrzeug);
  } catch (error) {
    console.error("GET /api/fahrzeuge/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    if (session.user.rolle !== "ADMIN") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateFahrzeugSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fahrzeug = await prisma.fahrzeug.update({
      where: { id },
      data: parsed.data,
      include: {
        positionen: {
          orderBy: { reihenfolge: "asc" },
        },
      },
    });

    return NextResponse.json(fahrzeug);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
    }
    console.error("PATCH /api/fahrzeuge/[id] error:", error);
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

    if (session.user.rolle !== "ADMIN") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const { id } = await params;

    const fahrzeug = await prisma.fahrzeug.update({
      where: { id },
      data: { aktiv: false },
    });

    return NextResponse.json(fahrzeug);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/fahrzeuge/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
