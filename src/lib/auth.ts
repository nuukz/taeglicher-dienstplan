import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { loginRateLimit, loginRateLimitReset } from "@/lib/rate-limit";

// Konstanter Dummy-Hash gegen Timing-/User-Enumeration: auch wenn kein User
// existiert, wird ein gleich teurer bcrypt-Vergleich ausgefuehrt.
const DUMMY_HASH = hashSync("nicht-vergebenes-platzhalter-passwort", 12);

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // Brute-Force-Schutz: pro E-Mail (+ IP wenn verfuegbar) begrenzen
        let ip = "unknown";
        try {
          const xff = request?.headers?.get?.("x-forwarded-for");
          if (xff) ip = xff.split(",")[0].trim();
        } catch {
          /* ignore */
        }
        if (loginRateLimit(`login:${email}|${ip}`)) {
          return null; // zu viele Versuche im Zeitfenster
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { abteilung: true },
        });

        // Immer einen bcrypt-Vergleich durchfuehren (konstante Antwortzeit).
        const isPasswordValid = await compare(
          password,
          user?.passwortHash ?? DUMMY_HASH
        );

        if (!user || !isPasswordValid) {
          return null;
        }

        // Inaktive Accounts und Tagesvertretungen (Platzhalter) sind nicht einloggbar
        if (!user.aktiv || user.vertretungFuerDatum) {
          return null;
        }

        // Erfolg: Rate-Limit fuer diese Kombination zuruecksetzen
        loginRateLimitReset(`login:${email}|${ip}`);

        return {
          id: user.id,
          email: user.email,
          rolle: user.rolle,
          vorname: user.vorname,
          nachname: user.nachname,
          abteilungId: user.abteilungId,
          abteilungName: user.abteilung.name,
        };
      },
    }),
  ],
});
