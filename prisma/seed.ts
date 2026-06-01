import "dotenv/config";
import { PrismaClient, Rolle, Beschaeftigung, SchichtTyp } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed startet...\n");

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

  // --- Qualifikationen ---
  const qualiDaten = [
    { kuerzel: "NotSan", name: "Notfallsanitäter", farbe: "#dc2626" },
    { kuerzel: "RS", name: "Rettungssanitäter", farbe: "#ea580c" },
    { kuerzel: "RA", name: "Rettungsassistent", farbe: "#d97706" },
    { kuerzel: "AGT", name: "Atemschutzgeräteträger", farbe: "#2563eb" },
    { kuerzel: "Masch", name: "Maschinist", farbe: "#7c3aed" },
    { kuerzel: "ZF", name: "Zugführer", farbe: "#0d9488" },
    { kuerzel: "TF", name: "Truppführer", farbe: "#4f46e5" },
    { kuerzel: "TM", name: "Truppmann", farbe: "#6b7280" },
    { kuerzel: "RdF", name: "Rettungsdienstfortbildung", farbe: "#be185d" },
    { kuerzel: "CSA", name: "Chemikalienschutzanzug", farbe: "#b45309" },
  ];

  const qualiMap: Record<string, string> = {};
  for (const q of qualiDaten) {
    const quali = await prisma.qualifikation.upsert({
      where: { kuerzel: q.kuerzel },
      update: { name: q.name, farbe: q.farbe },
      create: q,
    });
    qualiMap[q.kuerzel] = quali.id;
  }
  console.log(`${qualiDaten.length} Qualifikationen erstellt`);

  // --- Fahrzeuge mit Positionen ---
  const fahrzeugDaten = [
    { name: "RTW Anton", typ: "Rettungswagen", reihenfolge: 1, positionen: ["Fahrer", "Beifahrer", "Azubi"] },
    { name: "RTW Berta", typ: "Rettungswagen", reihenfolge: 2, positionen: ["Fahrer", "Beifahrer", "Azubi"] },
    { name: "RTW Cäsar", typ: "Rettungswagen", reihenfolge: 3, positionen: ["Fahrer", "Beifahrer", "Azubi"] },
    { name: "RTW Dora", typ: "Rettungswagen", reihenfolge: 4, positionen: ["Fahrer", "Beifahrer", "Azubi"] },
    { name: "HLF", typ: "Hamburger Löschfahrzeug", reihenfolge: 5, positionen: ["Maschinist", "Fahrzeugführer", "Angriffstrupp 1", "Angriffstrupp 2", "Wassertrupp 1", "Wassertrupp 2", "Schlauchtrupp 1", "Schlauchtrupp 2"] },
    { name: "DL", typ: "Drehleiter", reihenfolge: 6, positionen: ["Maschinist", "Fahrzeugführer"] },
    { name: "ELW", typ: "Einsatzleitwagen", reihenfolge: 7, positionen: ["C-Dienst"] },
    { name: "GW MANV", typ: "Gerätewagen MANV", reihenfolge: 8, positionen: ["Fahrer", "Beifahrer"] },
    { name: "RTW Kaufmann", typ: "Rettungswagen", reihenfolge: 9, positionen: ["Fahrer", "Beifahrer"] },
  ];

  const fahrzeugMap: Record<string, { id: string; positionen: Record<string, string> }> = {};

  for (const fz of fahrzeugDaten) {
    const fahrzeug = await prisma.fahrzeug.upsert({
      where: { name: fz.name },
      update: {},
      create: { name: fz.name, typ: fz.typ, reihenfolge: fz.reihenfolge },
    });

    fahrzeugMap[fz.name] = { id: fahrzeug.id, positionen: {} };

    for (let i = 0; i < fz.positionen.length; i++) {
      const pos = await prisma.fahrzeugPosition.upsert({
        where: { fahrzeugId_name: { fahrzeugId: fahrzeug.id, name: fz.positionen[i] } },
        update: {},
        create: { name: fz.positionen[i], fahrzeugId: fahrzeug.id, reihenfolge: i + 1 },
      });
      fahrzeugMap[fz.name].positionen[fz.positionen[i]] = pos.id;
    }
    console.log(`Fahrzeug ${fz.name} mit ${fz.positionen.length} Positionen erstellt`);
  }

  // --- Sonderfunktionen ---
  const sonderfunktionNamen = ["Koch", "Tagesdienst", "Schirmmeister", "Atemschutzwerkstatt", "Schlauchpflege"];
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

  // --- Personal ---
  const passwort = await bcrypt.hash("test123", 12);
  const adminPasswort = await bcrypt.hash("admin123", 12);
  const sysopPasswort = await bcrypt.hash("sysop123", 12);

  // --- SYSOP User ---
  await prisma.user.upsert({
    where: { email: "sysop@shifthero.de" },
    update: {},
    create: {
      email: "sysop@shifthero.de",
      passwortHash: sysopPasswort,
      vorname: "System",
      nachname: "Admin",
      rolle: Rolle.SYSOP,
      beschaeftigung: Beschaeftigung.BEAMTER,
      abteilungId: abt1.id,
      aktiv: false, // Kein aktiver Feuerwehrmann
    },
  });
  console.log("SYSOP-User erstellt");

  interface UserDef {
    email: string;
    vorname: string;
    nachname: string;
    rolle: Rolle;
    beschaeftigung: Beschaeftigung;
    abteilungId: string;
    pw?: string;
    qualifikationen: string[]; // Kürzel
  }

  async function createUserWithQuali(def: UserDef) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        passwortHash: def.pw || passwort,
        vorname: def.vorname,
        nachname: def.nachname,
        rolle: def.rolle,
        beschaeftigung: def.beschaeftigung,
        abteilungId: def.abteilungId,
      },
    });

    // Qualifikationen zuweisen
    for (const kuerzel of def.qualifikationen) {
      const qId = qualiMap[kuerzel];
      if (qId) {
        await prisma.userQualifikation.upsert({
          where: { userId_qualifikationId: { userId: user.id, qualifikationId: qId } },
          update: {},
          create: { userId: user.id, qualifikationId: qId },
        });
      }
    }

    return user;
  }

  // =============================================
  // WACHABTEILUNG 1
  // =============================================
  const abt1Users: UserDef[] = [
    // Admin / C-Dienst
    { email: "admin@feuerwehr.de", vorname: "Marco", nachname: "Weber", rolle: Rolle.ADMIN, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, pw: adminPasswort, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    // Beamte
    { email: "t.schneider@feuerwehr.de", vorname: "Thomas", nachname: "Schneider", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    { email: "s.mueller@feuerwehr.de", vorname: "Stefan", nachname: "Müller", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "TF", "AGT"] },
    { email: "m.fischer@feuerwehr.de", vorname: "Michael", nachname: "Fischer", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "ZF", "AGT", "Masch"] },
    { email: "d.wagner@feuerwehr.de", vorname: "Daniel", nachname: "Wagner", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "TF", "AGT"] },
    { email: "j.becker@feuerwehr.de", vorname: "Jens", nachname: "Becker", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "p.hoffmann@feuerwehr.de", vorname: "Patrick", nachname: "Hoffmann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "ZF", "AGT"] },
    { email: "a.schulz@feuerwehr.de", vorname: "Andreas", nachname: "Schulz", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "c.koch@feuerwehr.de", vorname: "Christian", nachname: "Koch", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "TM", "CSA"] },
    { email: "m.braun@feuerwehr.de", vorname: "Martin", nachname: "Braun", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "k.zimmermann@feuerwehr.de", vorname: "Kevin", nachname: "Zimmermann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "f.hartmann@feuerwehr.de", vorname: "Frank", nachname: "Hartmann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "TM", "CSA"] },
    { email: "r.krause@feuerwehr.de", vorname: "René", nachname: "Krause", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "t.lange@feuerwehr.de", vorname: "Tim", nachname: "Lange", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "l.werner@feuerwehr.de", vorname: "Lars", nachname: "Werner", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "TM"] },
    { email: "h.schmitz@feuerwehr.de", vorname: "Holger", nachname: "Schmitz", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT", "TM"] },
    // Angestellte
    { email: "n.klein@feuerwehr.de", vorname: "Nils", nachname: "Klein", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt1.id, qualifikationen: ["NotSan", "AGT"] },
    { email: "s.wolf@feuerwehr.de", vorname: "Sven", nachname: "Wolf", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt1.id, qualifikationen: ["RS"] },
    { email: "b.schroeder@feuerwehr.de", vorname: "Benjamin", nachname: "Schröder", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt1.id, qualifikationen: ["NotSan"] },
    { email: "m.neumann@feuerwehr.de", vorname: "Markus", nachname: "Neumann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt1.id, qualifikationen: ["RS", "AGT"] },
    { email: "d.schwarz@feuerwehr.de", vorname: "Dennis", nachname: "Schwarz", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt1.id, qualifikationen: ["RS"] },
    // Azubis
    { email: "l.meyer@feuerwehr.de", vorname: "Leon", nachname: "Meyer", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.AZUBI, abteilungId: abt1.id, qualifikationen: ["TM"] },
    { email: "j.walter@feuerwehr.de", vorname: "Jonas", nachname: "Walter", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.AZUBI, abteilungId: abt1.id, qualifikationen: ["TM"] },
  ];

  // =============================================
  // WACHABTEILUNG 2
  // =============================================
  const abt2Users: UserDef[] = [
    // Admin
    { email: "o.richter@feuerwehr.de", vorname: "Oliver", nachname: "Richter", rolle: Rolle.ADMIN, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, pw: adminPasswort, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    // Beamte
    { email: "m.vogt@feuerwehr.de", vorname: "Matthias", nachname: "Vogt", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    { email: "p.bergmann@feuerwehr.de", vorname: "Peter", nachname: "Bergmann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "TF", "AGT"] },
    { email: "s.koenig@feuerwehr.de", vorname: "Sascha", nachname: "König", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "ZF", "AGT", "Masch"] },
    { email: "a.frank@feuerwehr.de", vorname: "Alexander", nachname: "Frank", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "r.jung@feuerwehr.de", vorname: "Robert", nachname: "Jung", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "t.haas@feuerwehr.de", vorname: "Tobias", nachname: "Haas", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "ZF", "AGT"] },
    { email: "c.fuchs@feuerwehr.de", vorname: "Carsten", nachname: "Fuchs", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "TM", "CSA"] },
    { email: "m.peters@feuerwehr.de", vorname: "Manuel", nachname: "Peters", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "j.scholz@feuerwehr.de", vorname: "Julian", nachname: "Scholz", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "AGT", "TF", "CSA"] },
    { email: "d.sommer@feuerwehr.de", vorname: "Dirk", nachname: "Sommer", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "h.winter@feuerwehr.de", vorname: "Hendrik", nachname: "Winter", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "f.baumann@feuerwehr.de", vorname: "Florian", nachname: "Baumann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "TM"] },
    { email: "n.roth@feuerwehr.de", vorname: "Nico", nachname: "Roth", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "k.schreiber@feuerwehr.de", vorname: "Kai", nachname: "Schreiber", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT", "TM"] },
    // Angestellte
    { email: "l.horn@feuerwehr.de", vorname: "Lukas", nachname: "Horn", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt2.id, qualifikationen: ["NotSan", "AGT"] },
    { email: "j.pfeiffer@feuerwehr.de", vorname: "Jan", nachname: "Pfeiffer", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt2.id, qualifikationen: ["RS"] },
    { email: "m.lorenz@feuerwehr.de", vorname: "Marc", nachname: "Lorenz", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt2.id, qualifikationen: ["NotSan"] },
    { email: "s.simon@feuerwehr.de", vorname: "Sebastian", nachname: "Simon", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt2.id, qualifikationen: ["RS", "AGT"] },
    { email: "b.ludwig@feuerwehr.de", vorname: "Bastian", nachname: "Ludwig", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt2.id, qualifikationen: ["RS"] },
    // Azubis
    { email: "n.huber@feuerwehr.de", vorname: "Noah", nachname: "Huber", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.AZUBI, abteilungId: abt2.id, qualifikationen: ["TM"] },
  ];

  // =============================================
  // WACHABTEILUNG 3
  // =============================================
  const abt3Users: UserDef[] = [
    // Admin
    { email: "j.schaefer@feuerwehr.de", vorname: "Jan", nachname: "Schäfer", rolle: Rolle.ADMIN, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, pw: adminPasswort, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    // Beamte
    { email: "c.krueger@feuerwehr.de", vorname: "Chris", nachname: "Krüger", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "ZF", "AGT", "Masch"] },
    { email: "m.engel@feuerwehr.de", vorname: "Moritz", nachname: "Engel", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "TF", "AGT"] },
    { email: "t.brandt@feuerwehr.de", vorname: "Thorsten", nachname: "Brandt", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RA", "ZF", "AGT", "Masch"] },
    { email: "s.hahn@feuerwehr.de", vorname: "Stefan", nachname: "Hahn", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "TF", "AGT"] },
    { email: "a.vogel@feuerwehr.de", vorname: "Andre", nachname: "Vogel", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "r.weiss@feuerwehr.de", vorname: "Ralph", nachname: "Weiß", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "ZF", "AGT", "CSA"] },
    { email: "p.seidel@feuerwehr.de", vorname: "Philipp", nachname: "Seidel", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "d.ernst@feuerwehr.de", vorname: "David", nachname: "Ernst", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "TM", "CSA"] },
    { email: "h.otto@feuerwehr.de", vorname: "Heiko", nachname: "Otto", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "j.keller@feuerwehr.de", vorname: "Jonas", nachname: "Keller", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "TM"] },
    { email: "n.beck@feuerwehr.de", vorname: "Nils", nachname: "Beck", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "Masch", "TF"] },
    { email: "f.stein@feuerwehr.de", vorname: "Felix", nachname: "Stein", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "TM"] },
    { email: "l.grosse@feuerwehr.de", vorname: "Lennart", nachname: "Große", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "AGT", "TF"] },
    { email: "m.dietrich@feuerwehr.de", vorname: "Marcel", nachname: "Dietrich", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.BEAMTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT", "TM"] },
    // Angestellte
    { email: "e.karl@feuerwehr.de", vorname: "Erik", nachname: "Karl", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt3.id, qualifikationen: ["NotSan", "AGT"] },
    { email: "t.martin@feuerwehr.de", vorname: "Tom", nachname: "Martin", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt3.id, qualifikationen: ["RS"] },
    { email: "p.hermann@feuerwehr.de", vorname: "Paul", nachname: "Hermann", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt3.id, qualifikationen: ["NotSan"] },
    { email: "s.busch@feuerwehr.de", vorname: "Simon", nachname: "Busch", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt3.id, qualifikationen: ["RS", "AGT"] },
    { email: "j.jansen@feuerwehr.de", vorname: "Jörg", nachname: "Jansen", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.ANGESTELLTER, abteilungId: abt3.id, qualifikationen: ["RS"] },
    // Azubis
    { email: "f.kramer@feuerwehr.de", vorname: "Finn", nachname: "Krämer", rolle: Rolle.KOLLEGE, beschaeftigung: Beschaeftigung.AZUBI, abteilungId: abt3.id, qualifikationen: ["TM"] },
  ];

  // Alle User anlegen
  const allUserDefs = [...abt1Users, ...abt2Users, ...abt3Users];
  const userMap: Record<string, Awaited<ReturnType<typeof createUserWithQuali>>> = {};

  for (const def of allUserDefs) {
    userMap[def.email] = await createUserWithQuali(def);
  }

  console.log(`\n${allUserDefs.length} Kollegen erstellt:`);
  console.log(`  Abt 1: ${abt1Users.length} (${abt1Users.filter(u => u.beschaeftigung === "BEAMTER").length} Beamte, ${abt1Users.filter(u => u.beschaeftigung === "ANGESTELLTER").length} Angestellte, ${abt1Users.filter(u => u.beschaeftigung === "AZUBI").length} Azubis)`);
  console.log(`  Abt 2: ${abt2Users.length} (${abt2Users.filter(u => u.beschaeftigung === "BEAMTER").length} Beamte, ${abt2Users.filter(u => u.beschaeftigung === "ANGESTELLTER").length} Angestellte, ${abt2Users.filter(u => u.beschaeftigung === "AZUBI").length} Azubis)`);
  console.log(`  Abt 3: ${abt3Users.length} (${abt3Users.filter(u => u.beschaeftigung === "BEAMTER").length} Beamte, ${abt3Users.filter(u => u.beschaeftigung === "ANGESTELLTER").length} Angestellte, ${abt3Users.filter(u => u.beschaeftigung === "AZUBI").length} Azubis)`);

  // =============================================
  // Dienstpläne für HEUTE – alle 3 Abteilungen
  // =============================================
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  // Bestehende Zuweisungen und Dienstpläne löschen
  await prisma.zuweisung.deleteMany({});
  await prisma.tagesFahrzeug.deleteMany({});
  await prisma.dienstplanAenderung.deleteMany({});
  await prisma.dienstplan.deleteMany({});

  // Helper: Dienstplan + Zuweisungen anlegen
  async function createSchichtMitZuweisungen(
    abtId: string,
    schicht: SchichtTyp,
    zuweisungen: { email: string; fahrzeug: string; position: string; sonderfunktion?: string }[],
    veroeffentlicht: boolean = true
  ) {
    const dp = await prisma.dienstplan.create({
      data: {
        datum: heute,
        schicht,
        abteilungId: abtId,
        veroeffentlicht,
      },
    });

    for (const z of zuweisungen) {
      const user = userMap[z.email];
      const posId = fahrzeugMap[z.fahrzeug]?.positionen[z.position];
      if (!user || !posId) {
        console.warn(`  WARNUNG: ${z.email} / ${z.fahrzeug} ${z.position} nicht gefunden`);
        continue;
      }
      await prisma.zuweisung.create({
        data: {
          dienstplanId: dp.id,
          userId: user.id,
          fahrzeugPositionId: posId,
          sonderfunktionId: z.sonderfunktion ? sonderfunktionMap[z.sonderfunktion] : null,
        },
      });
    }

    return dp;
  }

  // --- ABT 1 TAG ---
  await createSchichtMitZuweisungen(abt1.id, SchichtTyp.TAG, [
    { email: "t.schneider@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "n.klein@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "s.mueller@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "s.wolf@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "m.fischer@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "b.schroeder@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "d.wagner@feuerwehr.de", fahrzeug: "RTW Dora", position: "Fahrer" },
    { email: "m.neumann@feuerwehr.de", fahrzeug: "RTW Dora", position: "Beifahrer" },
    { email: "j.becker@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "p.hoffmann@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "a.schulz@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "c.koch@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "m.braun@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "k.zimmermann@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "f.hartmann@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 1" },
    { email: "d.schwarz@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 2" },
    { email: "r.krause@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "t.lange@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "admin@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
    { email: "l.werner@feuerwehr.de", fahrzeug: "GW MANV", position: "Fahrer", sonderfunktion: "Koch" },
    { email: "h.schmitz@feuerwehr.de", fahrzeug: "GW MANV", position: "Beifahrer", sonderfunktion: "Schirmmeister" },
  ]);
  console.log("\nAbt 1 Tagschicht: 21 Zuweisungen");

  // --- ABT 1 NACHT ---
  const abt1Nacht = await createSchichtMitZuweisungen(abt1.id, SchichtTyp.NACHT, [
    { email: "t.schneider@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "t.lange@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "s.mueller@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "m.braun@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "m.fischer@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "c.koch@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "j.becker@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "p.hoffmann@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "a.schulz@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "k.zimmermann@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "f.hartmann@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "d.wagner@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "r.krause@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "l.werner@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "admin@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
    { email: "h.schmitz@feuerwehr.de", fahrzeug: "GW MANV", position: "Fahrer" },
  ]);
  // RTW Dora nachts deaktiviert
  await prisma.tagesFahrzeug.create({
    data: { dienstplanId: abt1Nacht.id, fahrzeugId: fahrzeugMap["RTW Dora"].id, aktiv: false },
  });
  console.log("Abt 1 Nachtschicht: 16 Zuweisungen (RTW Dora deaktiviert)");

  // --- ABT 2 TAG ---
  await createSchichtMitZuweisungen(abt2.id, SchichtTyp.TAG, [
    { email: "m.vogt@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "l.horn@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "p.bergmann@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "j.pfeiffer@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "s.koenig@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "m.lorenz@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "a.frank@feuerwehr.de", fahrzeug: "RTW Dora", position: "Fahrer" },
    { email: "s.simon@feuerwehr.de", fahrzeug: "RTW Dora", position: "Beifahrer" },
    { email: "r.jung@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "t.haas@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "c.fuchs@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "m.peters@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "j.scholz@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "d.sommer@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "h.winter@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 1" },
    { email: "b.ludwig@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 2" },
    { email: "f.baumann@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "n.roth@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "o.richter@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
    { email: "k.schreiber@feuerwehr.de", fahrzeug: "GW MANV", position: "Fahrer", sonderfunktion: "Koch" },
  ]);
  console.log("Abt 2 Tagschicht: 20 Zuweisungen");

  // --- ABT 2 NACHT ---
  const abt2Nacht = await createSchichtMitZuweisungen(abt2.id, SchichtTyp.NACHT, [
    { email: "m.vogt@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "n.roth@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "p.bergmann@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "j.scholz@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "s.koenig@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "c.fuchs@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "r.jung@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "t.haas@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "m.peters@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "d.sommer@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "h.winter@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "a.frank@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "f.baumann@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "k.schreiber@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "o.richter@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
  ]);
  await prisma.tagesFahrzeug.create({
    data: { dienstplanId: abt2Nacht.id, fahrzeugId: fahrzeugMap["RTW Dora"].id, aktiv: false },
  });
  console.log("Abt 2 Nachtschicht: 15 Zuweisungen (RTW Dora deaktiviert)");

  // --- ABT 3 TAG ---
  await createSchichtMitZuweisungen(abt3.id, SchichtTyp.TAG, [
    { email: "c.krueger@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "e.karl@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "m.engel@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "t.martin@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "t.brandt@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "p.hermann@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "s.hahn@feuerwehr.de", fahrzeug: "RTW Dora", position: "Fahrer" },
    { email: "s.busch@feuerwehr.de", fahrzeug: "RTW Dora", position: "Beifahrer" },
    { email: "a.vogel@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "r.weiss@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "p.seidel@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "d.ernst@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "h.otto@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "j.keller@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "n.beck@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 1" },
    { email: "j.jansen@feuerwehr.de", fahrzeug: "HLF", position: "Schlauchtrupp 2" },
    { email: "f.stein@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "l.grosse@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "j.schaefer@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
    { email: "m.dietrich@feuerwehr.de", fahrzeug: "GW MANV", position: "Fahrer", sonderfunktion: "Koch" },
  ]);
  console.log("Abt 3 Tagschicht: 20 Zuweisungen");

  // --- ABT 3 NACHT ---
  const abt3Nacht = await createSchichtMitZuweisungen(abt3.id, SchichtTyp.NACHT, [
    { email: "c.krueger@feuerwehr.de", fahrzeug: "RTW Anton", position: "Fahrer" },
    { email: "l.grosse@feuerwehr.de", fahrzeug: "RTW Anton", position: "Beifahrer" },
    { email: "m.engel@feuerwehr.de", fahrzeug: "RTW Berta", position: "Fahrer" },
    { email: "h.otto@feuerwehr.de", fahrzeug: "RTW Berta", position: "Beifahrer" },
    { email: "t.brandt@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Fahrer" },
    { email: "d.ernst@feuerwehr.de", fahrzeug: "RTW Cäsar", position: "Beifahrer" },
    { email: "a.vogel@feuerwehr.de", fahrzeug: "HLF", position: "Maschinist" },
    { email: "r.weiss@feuerwehr.de", fahrzeug: "HLF", position: "Fahrzeugführer" },
    { email: "p.seidel@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 1" },
    { email: "j.keller@feuerwehr.de", fahrzeug: "HLF", position: "Angriffstrupp 2" },
    { email: "n.beck@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 1" },
    { email: "s.hahn@feuerwehr.de", fahrzeug: "HLF", position: "Wassertrupp 2" },
    { email: "f.stein@feuerwehr.de", fahrzeug: "DL", position: "Maschinist" },
    { email: "m.dietrich@feuerwehr.de", fahrzeug: "DL", position: "Fahrzeugführer" },
    { email: "j.schaefer@feuerwehr.de", fahrzeug: "ELW", position: "C-Dienst" },
  ]);
  await prisma.tagesFahrzeug.create({
    data: { dienstplanId: abt3Nacht.id, fahrzeugId: fahrzeugMap["RTW Dora"].id, aktiv: false },
  });
  console.log("Abt 3 Nachtschicht: 15 Zuweisungen (RTW Dora deaktiviert)");

  // --- Positions-Qualifikationsanforderungen ---
  const posQualiDefaults: { fahrzeug: string; position: string; qualis: string[] }[] = [
    // RTW-Positionen: Fahrer braucht RS oder NotSan
    { fahrzeug: "RTW Anton", position: "Fahrer", qualis: ["RS"] },
    { fahrzeug: "RTW Anton", position: "Beifahrer", qualis: ["NotSan"] },
    { fahrzeug: "RTW Berta", position: "Fahrer", qualis: ["RS"] },
    { fahrzeug: "RTW Berta", position: "Beifahrer", qualis: ["NotSan"] },
    { fahrzeug: "RTW Cäsar", position: "Fahrer", qualis: ["RS"] },
    { fahrzeug: "RTW Cäsar", position: "Beifahrer", qualis: ["NotSan"] },
    { fahrzeug: "RTW Dora", position: "Fahrer", qualis: ["RS"] },
    { fahrzeug: "RTW Dora", position: "Beifahrer", qualis: ["NotSan"] },
    { fahrzeug: "RTW Kaufmann", position: "Fahrer", qualis: ["RS"] },
    { fahrzeug: "RTW Kaufmann", position: "Beifahrer", qualis: ["NotSan"] },
    // HLF: Maschinist braucht Masch, Fahrzeugfuehrer braucht GF
    { fahrzeug: "HLF", position: "Maschinist", qualis: ["Masch"] },
    { fahrzeug: "HLF", position: "Fahrzeugführer", qualis: ["ZF"] },
    // DL: Maschinist braucht Masch
    { fahrzeug: "DL", position: "Maschinist", qualis: ["Masch"] },
    // ELW: C-Dienst braucht ZF oder GF
    { fahrzeug: "ELW", position: "C-Dienst", qualis: ["ZF"] },
  ];

  for (const pq of posQualiDefaults) {
    const posId = fahrzeugMap[pq.fahrzeug]?.positionen[pq.position];
    if (!posId) continue;
    for (const kuerzel of pq.qualis) {
      const qId = qualiMap[kuerzel];
      if (!qId) continue;
      await prisma.positionQualifikation.upsert({
        where: { positionId_qualifikationId: { positionId: posId, qualifikationId: qId } },
        update: {},
        create: { positionId: posId, qualifikationId: qId },
      });
    }
  }
  console.log("Positions-Qualifikationsanforderungen erstellt");

  console.log("\n=============================");
  console.log("Seed abgeschlossen!");
  console.log("=============================");
  console.log("\nLogin-Daten:");
  console.log("  SYSOP:       sysop@shifthero.de / sysop123");
  console.log("  Abt 1 Admin: admin@feuerwehr.de / admin123");
  console.log("  Abt 2 Admin: o.richter@feuerwehr.de / admin123");
  console.log("  Abt 3 Admin: j.schaefer@feuerwehr.de / admin123");
  console.log("  Kollegen:    <vorname.nachname>@feuerwehr.de / test123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
