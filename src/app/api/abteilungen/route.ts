import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const abteilungen = await prisma.abteilung.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(abteilungen);
  } catch (error) {
    console.error("GET /api/abteilungen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
