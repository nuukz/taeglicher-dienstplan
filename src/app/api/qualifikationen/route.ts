import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQualifikationSchema } from "@/lib/validations";
import { requireRole } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const qualifikationen = await prisma.qualifikation.findMany({
    orderBy: { kuerzel: "asc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return NextResponse.json(qualifikationen);
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
    const parsed = createQualifikationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const qualifikation = await prisma.qualifikation.create({
      data: parsed.data,
    });

    return NextResponse.json(qualifikation, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Kuerzel existiert bereits" },
        { status: 409 }
      );
    }
    console.error("POST /api/qualifikationen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
