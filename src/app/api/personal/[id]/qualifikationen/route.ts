import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const userQualis = await prisma.userQualifikation.findMany({
    where: { userId: params.id },
    include: { qualifikation: true },
  });

  return NextResponse.json(userQualis.map((uq) => uq.qualifikation));
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const denied = requireRole(session, "ADMIN");
  if (denied) return denied;

  const body = await request.json();
  const qualifikationIds: string[] = body.qualifikationIds;

  if (!Array.isArray(qualifikationIds)) {
    return NextResponse.json(
      { error: "qualifikationIds muss ein Array sein" },
      { status: 400 }
    );
  }

  // Alle bestehenden entfernen
  await prisma.userQualifikation.deleteMany({
    where: { userId: params.id },
  });

  // Neue setzen
  if (qualifikationIds.length > 0) {
    await prisma.userQualifikation.createMany({
      data: qualifikationIds.map((qId) => ({
        userId: params.id,
        qualifikationId: qId,
      })),
    });
  }

  // Aktualisierte Liste zurueckgeben
  const updated = await prisma.userQualifikation.findMany({
    where: { userId: params.id },
    include: { qualifikation: true },
  });

  return NextResponse.json(updated.map((uq) => uq.qualifikation));
}
