import type { NextAuthConfig } from "next-auth";

// Edge-kompatible Auth-Config (ohne Prisma/pg imports)
// Wird von der Middleware verwendet
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
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
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rolle = token.rolle as "SYSOP" | "ADMIN" | "KOLLEGE";
      session.user.vorname = token.vorname as string;
      session.user.nachname = token.nachname as string;
      session.user.abteilungId = token.abteilungId as string;
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
