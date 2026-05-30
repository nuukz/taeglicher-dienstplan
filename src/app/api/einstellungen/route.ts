import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateSchichtKonfigurationSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const konfigurationen = await prisma.schichtKonfiguration.findMany({
      orderBy: { schicht: "asc" },
    });

    return NextResponse.json(konfigurationen);
  } catch (error) {
    console.error("GET /api/einstellungen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = updateSchichtKonfigurationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { schicht, startZeit, endZeit } = parsed.data;

    const konfiguration = await prisma.schichtKonfiguration.upsert({
      where: { schicht },
      update: { startZeit, endZeit },
      create: { schicht, startZeit, endZeit },
    });

    return NextResponse.json(konfiguration);
  } catch (error) {
    console.error("PATCH /api/einstellungen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
