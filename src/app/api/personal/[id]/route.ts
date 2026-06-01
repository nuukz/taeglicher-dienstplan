import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { updateUserSchema } from "@/lib/validations";
import { requireRole, darfUser, isSysop } from "@/lib/permissions";

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

    // Abteilungstrennung: nur Benutzer der eigenen Abteilung (Azubis ausgenommen)
    if (!darfUser(session, user)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Benutzer" }, { status: 403 });
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

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

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

    // Ziel-User laden fuer Abteilungs-/Eskalations-Pruefung
    const ziel = await prisma.user.findUnique({
      where: { id },
      select: { abteilungId: true, beschaeftigung: true },
    });
    if (!ziel) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    if (!darfUser(session, ziel)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Benutzer" }, { status: 403 });
    }

    // Eskalation verhindern: SYSOP-Rolle und Abteilungswechsel nur durch SYSOP
    if (!isSysop(session.user.rolle)) {
      if (data.rolle === "SYSOP") {
        return NextResponse.json(
          { error: "Keine Berechtigung fuer diese Rolle" },
          { status: 403 }
        );
      }
      if (data.abteilungId && data.abteilungId !== session.user.abteilungId) {
        return NextResponse.json(
          { error: "Kein Zugriff auf diese Wachabteilung" },
          { status: 403 }
        );
      }
    }

    // Whitelist: nur explizit erlaubte Felder uebernehmen (kein Mass-Assignment)
    const updateData: Record<string, unknown> = {};
    if (data.vorname !== undefined) updateData.vorname = data.vorname;
    if (data.nachname !== undefined) updateData.nachname = data.nachname;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.beschaeftigung !== undefined) updateData.beschaeftigung = data.beschaeftigung;
    if (data.rolle !== undefined) updateData.rolle = data.rolle;
    if (data.abteilungId !== undefined) updateData.abteilungId = data.abteilungId;
    if (data.aktiv !== undefined) updateData.aktiv = data.aktiv;

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

    const denied = requireRole(session, "ADMIN");
    if (denied) return denied;

    const { id } = await params;
    const hard = new URL(request.url).searchParams.get("hard") === "1";

    // Ziel-User laden fuer Abteilungs-Pruefung
    const ziel = await prisma.user.findUnique({
      where: { id },
      select: { abteilungId: true, beschaeftigung: true, vertretungFuerDatum: true },
    });
    if (!ziel) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }
    if (!darfUser(session, ziel)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Benutzer" }, { status: 403 });
    }

    // Tagesvertretungen koennen hart geloescht werden (Platzhalter-Accounts).
    if (hard && ziel.vertretungFuerDatum) {
      await prisma.$transaction([
        prisma.zuweisung.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
      return NextResponse.json({ success: true });
    }

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
