import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const qualifikationen = await prisma.qualifikation.findMany({
    orderBy: { kuerzel: "asc" },
  });

  return NextResponse.json(qualifikationen);
}
