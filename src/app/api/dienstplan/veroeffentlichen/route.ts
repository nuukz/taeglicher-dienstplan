import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { veroeffentlichenSchema } from "@/lib/validations";
import { sendDienstplanPublished } from "@/lib/push";
import { requireRole } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const body = await request.json();
    const parsed = veroeffentlichenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dienstplanId } = parsed.data;

    // Dienstplan veröffentlichen mit Versionierung (in einer Transaktion)
    const dienstplan = await prisma.$transaction(async (tx) => {
      // Aktuellen Dienstplan mit Zuweisungen laden
      const current = await tx.dienstplan.findUnique({
        where: { id: dienstplanId },
        include: {
          abteilung: true,
          zuweisungen: {
            include: {
              user: { select: { vorname: true, nachname: true } },
              fahrzeugPosition: {
                include: { fahrzeug: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!current) {
        throw new Error("Record to update not found");
      }

      const newVersion = current.version + 1;

      // Snapshot der aktuellen Zuweisungen erstellen
      const snapshot = current.zuweisungen.map((z) => ({
        user: `${z.user.vorname} ${z.user.nachname}`,
        fahrzeug: z.fahrzeugPosition.fahrzeug.name,
        position: z.fahrzeugPosition.name,
      }));

      // Version inkrementieren + veröffentlichen
      const updated = await tx.dienstplan.update({
        where: { id: dienstplanId },
        data: {
          veroeffentlicht: true,
          version: newVersion,
        },
        include: {
          abteilung: true,
        },
      });

      // Änderung mit Version, User und Snapshot loggen
      const beschreibung = newVersion === 1
        ? `Veröffentlicht von ${session.user.vorname} ${session.user.nachname}`
        : `Aktualisiert (v${newVersion}) von ${session.user.vorname} ${session.user.nachname}`;

      await tx.dienstplanAenderung.create({
        data: {
          dienstplanId,
          version: newVersion,
          userId: session.user.id,
          beschreibung,
          snapshot: JSON.stringify(snapshot),
        },
      });

      return { ...updated, newVersion };
    });

    // Push-Benachrichtigungen senden (async, nicht blockierend)
    sendDienstplanPublished(dienstplanId, dienstplan.newVersion).catch((err) => {
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
