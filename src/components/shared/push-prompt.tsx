"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "push-prompt-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkShouldShow = useCallback(async () => {
    // Push nicht unterstützt?
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // Bereits dismissed?
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
        return;
      }
      // Dismiss ist abgelaufen, erneut anzeigen
      localStorage.removeItem(DISMISSED_KEY);
    }

    // Bereits Berechtigung erteilt und Subscription aktiv?
    if (Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            // Bereits abonniert, nicht anzeigen
            return;
          }
        }
      } catch {
        // Fehler ignorieren, Prompt anzeigen
      }
    }

    // Berechtigung wurde dauerhaft verweigert
    if (Notification.permission === "denied") {
      return;
    }

    setVisible(true);
  }, []);

  useEffect(() => {
    checkShouldShow();
  }, [checkShouldShow]);

  const handleActivate = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Berechtigung anfragen
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Berechtigung wurde nicht erteilt");
        setLoading(false);
        return;
      }

      // 2. Service Worker registrieren
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. VAPID Public Key holen
      const vapidResponse = await fetch("/api/push/vapid-key");
      if (!vapidResponse.ok) {
        throw new Error("VAPID-Key konnte nicht geladen werden");
      }
      const { publicKey } = await vapidResponse.json();

      // 4. Push-Subscription erstellen
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // 5. Subscription an Server senden
      const subscriptionJson = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        }),
      });

      if (!response.ok) {
        throw new Error("Subscription konnte nicht gespeichert werden");
      }

      setVisible(false);
    } catch (err) {
      console.error("Push-Aktivierung fehlgeschlagen:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Benachrichtigungen konnten nicht aktiviert werden"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Bell className="size-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-blue-900">
            Benachrichtigungen aktivieren?
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Erhalte eine Nachricht, wenn ein neuer Dienstplan veröffentlicht
            wird oder sich deine Einteilung ändert.
          </p>
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
              <BellOff className="size-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Wird aktiviert..." : "Aktivieren"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              Später
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
