import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
    vorname: string;
    nachname: string;
    abteilungId: string;
    abteilungName: string;
  }

  interface Session {
    user: {
      id: string;
      rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
      vorname: string;
      nachname: string;
      abteilungId: string;
      abteilungName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rolle: "SYSOP" | "ADMIN" | "KOLLEGE";
    vorname: string;
    nachname: string;
    abteilungId: string;
    abteilungName: string;
  }
}
