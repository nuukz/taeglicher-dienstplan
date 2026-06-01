import type { NextAuthConfig } from "next-auth";

// NextAuth v5 erwartet AUTH_SECRET; wir akzeptieren weiterhin NEXTAUTH_SECRET.
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// Hardening: In Produktion KEIN Platzhalter / zu kurzes Secret zulassen,
// sonst koennten JWTs gefaelscht werden.
const secretUnsicher =
  !authSecret || authSecret.length < 32 || authSecret.includes("CHANGE_ME");
if (process.env.NODE_ENV === "production" && secretUnsicher) {
  throw new Error(
    "AUTH_SECRET/NEXTAUTH_SECRET fehlt oder ist ein Platzhalter. Bitte ein starkes Secret (>= 32 Zeichen) setzen."
  );
}

// Edge-kompatible Auth-Config (ohne Prisma/pg imports)
// Wird von der Middleware verwendet
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 Stunden statt 30 Tage (begrenzt Stale-Token-Risiko)
  },
  providers: [], // Providers werden in auth.ts hinzugefügt
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rolle = user.rolle as "SYSOP" | "ADMIN" | "KOLLEGE";
        token.vorname = user.vorname as string;
        token.nachname = user.nachname as string;
        token.abteilungId = user.abteilungId as string;
        token.abteilungName = user.abteilungName as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rolle = token.rolle as "SYSOP" | "ADMIN" | "KOLLEGE";
      session.user.vorname = token.vorname as string;
      session.user.nachname = token.nachname as string;
      session.user.abteilungId = token.abteilungId as string;
      session.user.abteilungName = token.abteilungName as string;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isPublicRoute =
        pathname.startsWith("/login") || pathname.startsWith("/api/auth");

      if (isPublicRoute) {
        if (isLoggedIn && pathname.startsWith("/login")) {
          return Response.redirect(new URL("/dienstplan", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
};
