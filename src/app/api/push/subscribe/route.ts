import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url("Ungültiger Endpoint"),
  p256dh: z.string().min(1, "p256dh ist erforderlich"),
  auth: z.string().min(1, "auth ist erforderlich"),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url("Ungültiger Endpoint"),
});

// Push-Subscription speichern
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth: authKey } = parsed.data;

    // Upsert: Falls der Endpoint schon existiert, aktualisieren
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh,
        auth: authKey,
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth: authKey,
      },
    });

    return NextResponse.json({ id: subscription.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// Push-Subscription entfernen
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint } = parsed.data;

    // Nur die eigene Subscription löschen
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/push/subscribe error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
