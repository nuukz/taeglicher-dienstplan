"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Schnell-Login-Buttons (mit Demo-Zugangsdaten) nur in der Entwicklung zeigen
  const isDev = process.env.NODE_ENV !== "production";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige Anmeldedaten");
        setLoading(false);
        return;
      }

      router.push("/dienstplan");
      router.refresh();
    } catch {
      setError("Ungültige Anmeldedaten");
      setLoading(false);
    }
  }

  const quickLogins = [
    { label: "Admin WA1", sublabel: "M. Weber", email: "admin@feuerwehr.de", password: "admin123" },
    { label: "Admin WA2", sublabel: "O. Richter", email: "o.richter@feuerwehr.de", password: "admin123" },
    { label: "Admin WA3", sublabel: "J. Schaefer", email: "j.schaefer@feuerwehr.de", password: "admin123" },
  ];

  async function handleQuickLogin(qEmail: string, qPassword: string) {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: qEmail,
        password: qPassword,
        redirect: false,
      });
      if (result?.error) {
        setError("Login fehlgeschlagen");
        setLoading(false);
        return;
      }
      router.push("/dienstplan");
      router.refresh();
    } catch {
      setError("Login fehlgeschlagen");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#8B1A1A]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            WachPlan
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            ShiftHero - Feuerwehr Anmeldung
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {isDev && (
          <>
          {/* SYSOP Quick-Login – nur in Entwicklung */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500 text-center">Schnell-Login (nur Entwicklung)</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin("sysop@shifthero.de", "sysop123")}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-3 py-2.5 text-center transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <span className="text-xs font-semibold text-white">SYSOP</span>
              <span className="text-[10px] text-slate-400">System-Admin</span>
            </button>

            {/* WA Quick-Login Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {quickLogins.map((q) => (
                <button
                  key={q.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(q.email, q.password)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 text-center transition-colors hover:border-[#8B1A1A]/30 hover:bg-red-50 disabled:opacity-50"
                >
                  <span className="text-xs font-semibold text-slate-700">{q.label}</span>
                  <span className="text-[10px] text-slate-400">{q.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">oder</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          </>
          )}

          {/* Manuelles Login */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@feuerwehr.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-9 w-full bg-[#8B1A1A] text-white hover:bg-[#6B1414] focus-visible:ring-[#8B1A1A]/50"
            >
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
