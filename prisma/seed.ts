import "dotenv/config";
import { PrismaClient, Rolle, Beschaeftigung, SchichtTyp } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed startet...");

  // --- Abteilungen ---
  const abteilungen = await Promise.all(
    ["1", "2", "3"].map((name) =>
      prisma.abteilung.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  const [abt1, abt2, abt3] = abteilungen;
  console.log(`${abteilungen.length} Abteilungen erstellt`);

  // --- Schicht-Konfiguration ---
  await prisma.schichtKonfiguration.upsert({
    where: { schicht: SchichtTyp.TAG },
    update: {},
    create: { schicht: SchichtTyp.TAG, startZeit: "07:00", endZeit: "19:00" },
  });
  await prisma.schichtKonfiguration.upsert({
    where: { schicht: SchichtTyp.NACHT },
    update: {},
    create: { schicht: SchichtTyp.NACHT, startZeit: "19:00", endZeit: "07:00" },
  });
  console.log("Schicht-Konfiguration erstellt");

  // --- Fahrzeuge mit Positionen ---
  const fahrzeugDaten = [
    {
      name: "RTW Anton",
      typ: "Rettungswagen",
      reihenfolge: 1,
      positionen: ["Fahrer", "Beifahrer"],
    },
    {
      name: "RTW Berta",
      typ: "Rettungswagen",
      reihenfolge: 2,
      positionen: ["Fahrer", "Beifahrer"],
    },
    {
      name: "RTW Cäsar",
      typ: "Rettungswagen",
      reihenfolge: 3,
      positionen: ["Fahrer", "Beifahrer"],
    },
    {
      name: "RTW Dora",
      typ: "Rettungswagen",
      reihenfolge: 4,
      positionen: ["Fahrer", "Beifahrer"],
    },
    {
      name: "HLF",
      typ: "Hilfeleistungslöschfahrzeug",
      reihenfolge: 5,
      positionen: [
        "Maschinist",
        "Fahrzeugführer",
        "Angriffstrupp 1",
        "Angriffstrupp 2",
        "Wassertrupp 1",
        "Wassertrupp 2",
        "Schlauchtrupp 1",
        "Schlauchtrupp 2",
      ],
    },
    {
      name: "DL",
      typ: "Drehleiter",
      reihenfolge: 6,
      positionen: ["Maschinist", "Fahrzeugführer"],
    },
    {
      name: "ELW",
      typ: "Einsatzleitwagen",
      reihenfolge: 7,
      positionen: ["C-Dienst"],
    },
    {
      name: "GW MANV",
      typ: "Gerätewagen MANV",
      reihenfolge: 8,
      positionen: ["Fahrer", "Beifahrer"],
    },
    {
      name: "RTW Kaufmann",
      typ: "Rettungswagen",
      reihenfolge: 9,
      positionen: ["Fahrer", "Beifahrer"],
    },
  ];

  const fahrzeugMap: Record<string, { id: string; positionen: Record<string, string> }> = {};

  for (const fz of fahrzeugDaten) {
    const fahrzeug = await prisma.fahrzeug.upsert({
      where: { name: fz.name },
      update: {},
      create: {
        name: fz.name,
        typ: fz.typ,
        reihenfolge: fz.reihenfolge,
      },
    });

    fahrzeugMap[fz.name] = { id: fahrzeug.id, positionen: {} };

    for (let i = 0; i < fz.positionen.length; i++) {
      const pos = await prisma.fahrzeugPosition.upsert({
        where: {
          fahrzeugId_name: {
            fahrzeugId: fahrzeug.id,
            name: fz.positionen[i],
          },
        },
        update: {},
        create: {
          name: fz.positionen[i],
          fahrzeugId: fahrzeug.id,
          reihenfolge: i + 1,
        },
      });
      fahrzeugMap[fz.name].positionen[fz.positionen[i]] = pos.id;
    }
    console.log(`Fahrzeug ${fz.name} mit ${fz.positionen.length} Positionen erstellt`);
  }

  // --- Sonderfunktionen ---
  const sonderfunktionNamen = [
    "Koch",
    "Tagesdienst",
    "Schirmmeister",
    "Atemschutzwerkstatt",
    "Schlauchpflege",
  ];

  const sonderfunktionMap: Record<string, string> = {};
  for (const name of sonderfunktionNamen) {
    const sf = await prisma.sonderfunktion.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    sonderfunktionMap[name] = sf.id;
  }
  console.log(`${sonderfunktionNamen.length} Sonderfunktionen erstellt`);

  // --- Personal: Komplette Crew Abteilung A ---
  const passwort = await bcrypt.hash("test123", 12);
  const adminPasswort = await bcrypt.hash("admin123", 12);

  // Helper
  async function createUser(
    email: string,
    vorname: string,
    nachname: string,
    rolle: Rolle,
    beschaeftigung: Beschaeftigung,
    abteilungId: string,
    pw?: string
  ) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwortHash: pw || passwort,
        vorname,
        nachname,
        rolle,
        beschaeftigung,
        abteilungId,
      },
    });
  }

  // Admin
  const admin = await createUser(
    "admin@feuerwehr.de", "Marco", "Weber",
    Rolle.ADMIN, Beschaeftigung.BEAMTER, abt1.id, adminPasswort
  );

  // --- Abteilung A: Beamte (24h-Dienst) ---
  const schneider = await createUser(
    "t.schneider@feuerwehr.de", "Thomas", "Schneider",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const mueller = await createUser(
    "s.mueller@feuerwehr.de", "Stefan", "Müller",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const fischer = await createUser(
    "m.fischer@feuerwehr.de", "Michael", "Fischer",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const wagner = await createUser(
    "d.wagner@feuerwehr.de", "Daniel", "Wagner",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const becker = await createUser(
    "j.becker@feuerwehr.de", "Jens", "Becker",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const hoffmann = await createUser(
    "p.hoffmann@feuerwehr.de", "Patrick", "Hoffmann",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const schulz = await createUser(
    "a.schulz@feuerwehr.de", "Andreas", "Schulz",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const koch = await createUser(
    "c.koch@feuerwehr.de", "Christian", "Koch",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const braun = await createUser(
    "m.braun@feuerwehr.de", "Martin", "Braun",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const zimmermann = await createUser(
    "k.zimmermann@feuerwehr.de", "Kevin", "Zimmermann",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const hartmann = await createUser(
    "f.hartmann@feuerwehr.de", "Frank", "Hartmann",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const krause = await createUser(
    "r.krause@feuerwehr.de", "René", "Krause",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const lange = await createUser(
    "t.lange@feuerwehr.de", "Tim", "Lange",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const werner = await createUser(
    "l.werner@feuerwehr.de", "Lars", "Werner",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );
  const schmitz = await createUser(
    "h.schmitz@feuerwehr.de", "Holger", "Schmitz",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt1.id
  );

  // --- Abteilung A: Angestellte (12h, nur Tag ODER Nacht) ---
  const klein = await createUser(
    "n.klein@feuerwehr.de", "Nils", "Klein",
    Rolle.KOLLEGE, Beschaeftigung.ANGESTELLTER, abt1.id
  );
  const wolf = await createUser(
    "s.wolf@feuerwehr.de", "Sven", "Wolf",
    Rolle.KOLLEGE, Beschaeftigung.ANGESTELLTER, abt1.id
  );
  const schroeder = await createUser(
    "b.schroeder@feuerwehr.de", "Benjamin", "Schröder",
    Rolle.KOLLEGE, Beschaeftigung.ANGESTELLTER, abt1.id
  );
  const neumann = await createUser(
    "m.neumann@feuerwehr.de", "Markus", "Neumann",
    Rolle.KOLLEGE, Beschaeftigung.ANGESTELLTER, abt1.id
  );
  const schwarz = await createUser(
    "d.schwarz@feuerwehr.de", "Dennis", "Schwarz",
    Rolle.KOLLEGE, Beschaeftigung.ANGESTELLTER, abt1.id
  );

  // --- Einige Leute für Abt B und C ---
  const richter = await createUser(
    "o.richter@feuerwehr.de", "Oliver", "Richter",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt2.id
  );
  const vogt = await createUser(
    "m.vogt@feuerwehr.de", "Matthias", "Vogt",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt2.id
  );
  const schaefer = await createUser(
    "j.schaefer@feuerwehr.de", "Jan", "Schäfer",
    Rolle.KOLLEGE, Beschaeftigung.BEAMTER, abt3.id
  );

  console.log("23 Kollegen erstellt (20 Abt A, 2 Abt B, 1 Abt C)");

  // =============================================
  // Dienstplan für HEUTE mit Zuweisungen
  // =============================================
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  // Tagschicht erstellen
  const tagSchicht = await prisma.dienstplan.upsert({
    where: {
      datum_schicht_abteilungId: {
        datum: heute,
        schicht: SchichtTyp.TAG,
        abteilungId: abt1.id,
      },
    },
    update: {},
    create: {
      datum: heute,
      schicht: SchichtTyp.TAG,
      abteilungId: abt1.id,
      veroeffentlicht: true,
    },
  });

  // Nachtschicht erstellen
  const nachtSchicht = await prisma.dienstplan.upsert({
    where: {
      datum_schicht_abteilungId: {
        datum: heute,
        schicht: SchichtTyp.NACHT,
        abteilungId: abt1.id,
      },
    },
    update: {},
    create: {
      datum: heute,
      schicht: SchichtTyp.NACHT,
      abteilungId: abt1.id,
      veroeffentlicht: true,
    },
  });

  console.log("Dienstplan für heute erstellt (Tag + Nacht, Abt A)");

  // Bestehende Zuweisungen löschen (bei Re-Seed)
  await prisma.zuweisung.deleteMany({ where: { dienstplanId: tagSchicht.id } });
  await prisma.zuweisung.deleteMany({ where: { dienstplanId: nachtSchicht.id } });

  // --- TAGSCHICHT Zuweisungen ---
  const tagZuweisungen = [
    // RTW Anton
    { userId: schneider.id, posId: fahrzeugMap["RTW Anton"].positionen["Fahrer"] },
    { userId: klein.id, posId: fahrzeugMap["RTW Anton"].positionen["Beifahrer"] },
    // RTW Berta
    { userId: mueller.id, posId: fahrzeugMap["RTW Berta"].positionen["Fahrer"] },
    { userId: wolf.id, posId: fahrzeugMap["RTW Berta"].positionen["Beifahrer"] },
    // RTW Cäsar
    { userId: fischer.id, posId: fahrzeugMap["RTW Cäsar"].positionen["Fahrer"] },
    { userId: schroeder.id, posId: fahrzeugMap["RTW Cäsar"].positionen["Beifahrer"] },
    // RTW Dora (Mo-Fr Tagdienst)
    { userId: wagner.id, posId: fahrzeugMap["RTW Dora"].positionen["Fahrer"] },
    { userId: neumann.id, posId: fahrzeugMap["RTW Dora"].positionen["Beifahrer"] },
    // HLF
    { userId: becker.id, posId: fahrzeugMap["HLF"].positionen["Maschinist"] },
    { userId: hoffmann.id, posId: fahrzeugMap["HLF"].positionen["Fahrzeugführer"] },
    { userId: schulz.id, posId: fahrzeugMap["HLF"].positionen["Angriffstrupp 1"] },
    { userId: koch.id, posId: fahrzeugMap["HLF"].positionen["Angriffstrupp 2"] },
    { userId: braun.id, posId: fahrzeugMap["HLF"].positionen["Wassertrupp 1"] },
    { userId: zimmermann.id, posId: fahrzeugMap["HLF"].positionen["Wassertrupp 2"] },
    { userId: hartmann.id, posId: fahrzeugMap["HLF"].positionen["Schlauchtrupp 1"] },
    { userId: schwarz.id, posId: fahrzeugMap["HLF"].positionen["Schlauchtrupp 2"] },
    // DL
    { userId: krause.id, posId: fahrzeugMap["DL"].positionen["Maschinist"] },
    { userId: lange.id, posId: fahrzeugMap["DL"].positionen["Fahrzeugführer"] },
    // ELW
    { userId: admin.id, posId: fahrzeugMap["ELW"].positionen["C-Dienst"] },
  ];

  for (const z of tagZuweisungen) {
    await prisma.zuweisung.create({
      data: {
        dienstplanId: tagSchicht.id,
        userId: z.userId,
        fahrzeugPositionId: z.posId,
      },
    });
  }

  // Sonderfunktionen Tag
  await prisma.zuweisung.update({
    where: {
      dienstplanId_userId: { dienstplanId: tagSchicht.id, userId: werner.id },
    },
    data: { sonderfunktionId: sonderfunktionMap["Koch"] },
  }).catch(() => {
    // Werner hat noch keine Zuweisung - machen wir über GW MANV
  });

  // Werner + Schmitz auf GW MANV (Tag)
  await prisma.zuweisung.create({
    data: {
      dienstplanId: tagSchicht.id,
      userId: werner.id,
      fahrzeugPositionId: fahrzeugMap["GW MANV"].positionen["Fahrer"],
      sonderfunktionId: sonderfunktionMap["Koch"],
    },
  });
  await prisma.zuweisung.create({
    data: {
      dienstplanId: tagSchicht.id,
      userId: schmitz.id,
      fahrzeugPositionId: fahrzeugMap["GW MANV"].positionen["Beifahrer"],
      sonderfunktionId: sonderfunktionMap["Schirmmeister"],
    },
  });

  console.log(`${tagZuweisungen.length + 2} Zuweisungen Tagschicht erstellt`);

  // --- NACHTSCHICHT Zuweisungen ---
  // Beamte können Tag+Nacht, Angestellte nur eins
  const nachtZuweisungen = [
    // RTW Anton (Beamte bleiben, Angestellte werden getauscht)
    { userId: schneider.id, posId: fahrzeugMap["RTW Anton"].positionen["Fahrer"] },
    { userId: lange.id, posId: fahrzeugMap["RTW Anton"].positionen["Beifahrer"] },
    // RTW Berta
    { userId: mueller.id, posId: fahrzeugMap["RTW Berta"].positionen["Fahrer"] },
    { userId: braun.id, posId: fahrzeugMap["RTW Berta"].positionen["Beifahrer"] },
    // RTW Cäsar
    { userId: fischer.id, posId: fahrzeugMap["RTW Cäsar"].positionen["Fahrer"] },
    { userId: koch.id, posId: fahrzeugMap["RTW Cäsar"].positionen["Beifahrer"] },
    // HLF (Nacht: reduzierte Besetzung)
    { userId: becker.id, posId: fahrzeugMap["HLF"].positionen["Maschinist"] },
    { userId: hoffmann.id, posId: fahrzeugMap["HLF"].positionen["Fahrzeugführer"] },
    { userId: schulz.id, posId: fahrzeugMap["HLF"].positionen["Angriffstrupp 1"] },
    { userId: zimmermann.id, posId: fahrzeugMap["HLF"].positionen["Angriffstrupp 2"] },
    { userId: hartmann.id, posId: fahrzeugMap["HLF"].positionen["Wassertrupp 1"] },
    { userId: wagner.id, posId: fahrzeugMap["HLF"].positionen["Wassertrupp 2"] },
    // DL
    { userId: krause.id, posId: fahrzeugMap["DL"].positionen["Maschinist"] },
    { userId: werner.id, posId: fahrzeugMap["DL"].positionen["Fahrzeugführer"] },
    // ELW
    { userId: admin.id, posId: fahrzeugMap["ELW"].positionen["C-Dienst"] },
    // GW MANV
    { userId: schmitz.id, posId: fahrzeugMap["GW MANV"].positionen["Fahrer"] },
  ];

  for (const z of nachtZuweisungen) {
    await prisma.zuweisung.create({
      data: {
        dienstplanId: nachtSchicht.id,
        userId: z.userId,
        fahrzeugPositionId: z.posId,
      },
    });
  }

  console.log(`${nachtZuweisungen.length} Zuweisungen Nachtschicht erstellt`);

  // RTW Dora Nachts deaktiviert (nur Mo-Fr Tag)
  await prisma.tagesFahrzeug.upsert({
    where: {
      dienstplanId_fahrzeugId: {
        dienstplanId: nachtSchicht.id,
        fahrzeugId: fahrzeugMap["RTW Dora"].id,
      },
    },
    update: {},
    create: {
      dienstplanId: nachtSchicht.id,
      fahrzeugId: fahrzeugMap["RTW Dora"].id,
      aktiv: false,
    },
  });
  console.log("RTW Dora für Nachtschicht deaktiviert");

  console.log("\n=============================");
  console.log("Seed abgeschlossen!");
  console.log("=============================");
  console.log("\nLogin-Daten:");
  console.log("  Admin:   admin@feuerwehr.de / admin123");
  console.log("  Kollege: t.schneider@feuerwehr.de / test123");
  console.log("           s.mueller@feuerwehr.de / test123");
  console.log("           (alle Kollegen: test123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
