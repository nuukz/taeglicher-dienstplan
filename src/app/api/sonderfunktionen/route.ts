import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createSonderfunktionSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const sonderfunktionen = await prisma.sonderfunktion.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(sonderfunktionen);
  } catch (error) {
    console.error("GET /api/sonderfunktionen error:", error);
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
    const parsed = createSonderfunktionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sonderfunktion = await prisma.sonderfunktion.create({
      data: parsed.data,
    });

    return NextResponse.json(sonderfunktion, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Sonderfunktion mit diesem Namen existiert bereits" },
        { status: 409 }
      );
    }
    console.error("POST /api/sonderfunktionen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
