import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAbteilungSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const abteilungen = await prisma.abteilung.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, dienstplaene: true },
        },
      },
    });

    return NextResponse.json(abteilungen);
  } catch (error) {
    console.error("GET /api/abteilungen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "SYSOP");
    if (denied) return denied;

    const body = await request.json();
    const parsed = createAbteilungSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const abteilung = await prisma.abteilung.create({
      data: parsed.data,
    });

    return NextResponse.json(abteilung, { status: 201 });
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
    console.error("POST /api/abteilungen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
