import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { veroeffentlichenSchema } from "@/lib/validations";
import { sendDienstplanPublished } from "@/lib/push";

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
    const parsed = veroeffentlichenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dienstplanId } = parsed.data;

    // Dienstplan veröffentlichen und Änderung loggen (in einer Transaktion)
    const dienstplan = await prisma.$transaction(async (tx) => {
      const updated = await tx.dienstplan.update({
        where: { id: dienstplanId },
        data: { veroeffentlicht: true },
        include: {
          abteilung: true,
        },
      });

      // Änderung loggen
      await tx.dienstplanAenderung.create({
        data: {
          dienstplanId,
          beschreibung: `Dienstplan veröffentlicht von ${session.user.vorname} ${session.user.nachname}`,
        },
      });

      return updated;
    });

    // Push-Benachrichtigungen an alle zugewiesenen User senden (async, nicht blockierend)
    sendDienstplanPublished(dienstplanId).catch((err) => {
      console.error("Push-Benachrichtigung fehlgeschlagen:", err);
    });

    return NextResponse.json(dienstplan);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Dienstplan nicht gefunden" }, { status: 404 });
    }
    console.error("POST /api/dienstplan/veroeffentlichen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
