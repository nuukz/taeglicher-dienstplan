import webPush from "web-push";
import { prisma } from "@/lib/prisma";

// --- VAPID-Konfiguration ---

let vapidConfigured = false;

function initWebPush() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO || "mailto:admin@squidion.de";

  if (!publicKey || !privateKey) {
    console.warn(
      "VAPID-Keys fehlen! Push-Benachrichtigungen sind deaktiviert. " +
        "Generiere mit: npx web-push generate-vapid-keys"
    );
    return;
  }

  webPush.setVapidDetails(mailto, publicKey, privateKey);
  vapidConfigured = true;
}

// --- Hilfsfunktion: Push senden + ungültige Subscriptions entfernen ---

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendAndCleanup(
  subscriptions: PushSubscriptionRecord[],
  payload: PushPayload
) {
  initWebPush();
  if (!vapidConfigured) return;

  const payloadString = JSON.stringify(payload);
  const invalidIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString
        );
      } catch (error: unknown) {
        const statusCode =
          error instanceof webPush.WebPushError ? error.statusCode : 0;

        // 410 Gone oder 404 Not Found = Subscription ist ungültig
        if (statusCode === 410 || statusCode === 404) {
          invalidIds.push(sub.id);
        } else {
          console.error(
            `Push-Fehler für ${sub.endpoint.slice(0, 50)}...:`,
            error
          );
        }
      }
    })
  );

  // Ungültige Subscriptions aus der DB entfernen
  if (invalidIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: invalidIds } },
    });
    console.log(`${invalidIds.length} ungültige Push-Subscription(s) entfernt`);
  }
}

// --- Öffentliche Funktionen ---

/**
 * Push an einen bestimmten User senden (alle seine Geräte)
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return;

  await sendAndCleanup(subscriptions, payload);
}

/**
 * Push an alle User senden
 */
export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return;

  await sendAndCleanup(subscriptions, payload);
}

/**
 * Push an alle zugewiesenen User senden wenn Dienstplan veröffentlicht wird
 */
export async function sendDienstplanPublished(dienstplanId: string) {
  const dienstplan = await prisma.dienstplan.findUnique({
    where: { id: dienstplanId },
    include: {
      zuweisungen: {
        include: {
          user: true,
          fahrzeugPosition: {
            include: {
              fahrzeug: true,
            },
          },
        },
      },
    },
  });

  if (!dienstplan) {
    console.error(`Dienstplan ${dienstplanId} nicht gefunden für Push`);
    return;
  }

  const schichtLabel = dienstplan.schicht === "TAG" ? "Tagschicht" : "Nachtschicht";

  // Jedem zugewiesenen User eine individuelle Nachricht senden
  await Promise.allSettled(
    dienstplan.zuweisungen.map(async (zuweisung) => {
      const fahrzeugName = zuweisung.fahrzeugPosition.fahrzeug.name;
      const positionName = zuweisung.fahrzeugPosition.name;

      await sendPushToUser(zuweisung.userId, {
        title: "Dienstplan veröffentlicht",
        body: `Du bist eingeteilt: ${fahrzeugName} ${positionName} (${schichtLabel})`,
        url: "/dienstplan",
      });
    })
  );
}

/**
 * Push bei Änderung der Zuweisung eines Users
 */
export async function sendDienstplanChanged(
  userId: string,
  altPosition: string,
  neuPosition: string
) {
  await sendPushToUser(userId, {
    title: "Dienstplan geändert",
    body: `Änderung: Du bist jetzt ${neuPosition} (vorher: ${altPosition})`,
    url: "/dienstplan",
  });
}
