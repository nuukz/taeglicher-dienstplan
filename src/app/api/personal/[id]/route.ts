import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { updateUserSchema } from "@/lib/validations";

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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        abteilung: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    const { passwortHash: _passwortHash, ...sanitized } = user;

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("GET /api/personal/[id] error:", error);
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { passwort, ...data } = parsed.data;

    const updateData: Record<string, unknown> = { ...data };

    if (passwort) {
      updateData.passwortHash = await hash(passwort, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        abteilung: true,
      },
    });

    const { passwortHash: _passwortHash, ...sanitized } = user;

    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    console.error("PATCH /api/personal/[id] error:", error);
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

    const user = await prisma.user.update({
      where: { id },
      data: { aktiv: false },
    });

    const { passwortHash: _passwortHash, ...sanitized } = user;

    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    console.error("DELETE /api/personal/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
