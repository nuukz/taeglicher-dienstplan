import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    rolle: "ADMIN" | "KOLLEGE";
    vorname: string;
    nachname: string;
    abteilungId: string;
  }

  interface Session {
    user: {
      id: string;
      rolle: "ADMIN" | "KOLLEGE";
      vorname: string;
      nachname: string;
      abteilungId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rolle: "ADMIN" | "KOLLEGE";
    vorname: string;
    nachname: string;
    abteilungId: string;
  }
}
