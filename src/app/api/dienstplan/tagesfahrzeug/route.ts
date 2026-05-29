import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { tagesFahrzeugSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    if (session.user.rolle !== "ADMIN") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = tagesFahrzeugSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dienstplanId, fahrzeugId, aktiv } = parsed.data;

    // Upsert: Wenn schon ein TagesFahrzeug-Eintrag existiert, aktualisieren; sonst erstellen
    const tagesFahrzeug = await prisma.tagesFahrzeug.upsert({
      where: {
        dienstplanId_fahrzeugId: {
          dienstplanId,
          fahrzeugId,
        },
      },
      update: { aktiv },
      create: {
        dienstplanId,
        fahrzeugId,
        aktiv,
      },
      include: {
        fahrzeug: true,
      },
    });

    return NextResponse.json(tagesFahrzeug);
  } catch (error) {
    console.error("POST /api/dienstplan/tagesfahrzeug error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
