-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('ADMIN', 'KOLLEGE');

-- CreateEnum
CREATE TYPE "Beschaeftigung" AS ENUM ('BEAMTER', 'ANGESTELLTER');

-- CreateEnum
CREATE TYPE "SchichtTyp" AS ENUM ('TAG', 'NACHT');

-- CreateTable
CREATE TABLE "dp_abteilung" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_abteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "rolle" "Rolle" NOT NULL DEFAULT 'KOLLEGE',
    "beschaeftigung" "Beschaeftigung" NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "abteilungId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_fahrzeug" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_fahrzeug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_fahrzeug_position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_fahrzeug_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_sonderfunktion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_sonderfunktion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_dienstplan" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "schicht" "SchichtTyp" NOT NULL,
    "abteilungId" TEXT NOT NULL,
    "veroeffentlicht" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_dienstplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_zuweisung" (
    "id" TEXT NOT NULL,
    "dienstplanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fahrzeugPositionId" TEXT NOT NULL,
    "sonderfunktionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_zuweisung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_tages_fahrzeug" (
    "id" TEXT NOT NULL,
    "dienstplanId" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dp_tages_fahrzeug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_dienstplan_aenderung" (
    "id" TEXT NOT NULL,
    "dienstplanId" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dp_dienstplan_aenderung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dp_push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_schicht_konfiguration" (
    "id" TEXT NOT NULL,
    "schicht" "SchichtTyp" NOT NULL,
    "startZeit" TEXT NOT NULL,
    "endZeit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_schicht_konfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dp_abteilung_name_key" ON "dp_abteilung"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dp_user_email_key" ON "dp_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dp_fahrzeug_name_key" ON "dp_fahrzeug"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dp_fahrzeug_position_fahrzeugId_name_key" ON "dp_fahrzeug_position"("fahrzeugId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dp_sonderfunktion_name_key" ON "dp_sonderfunktion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dp_dienstplan_datum_schicht_abteilungId_key" ON "dp_dienstplan"("datum", "schicht", "abteilungId");

-- CreateIndex
CREATE UNIQUE INDEX "dp_zuweisung_dienstplanId_fahrzeugPositionId_key" ON "dp_zuweisung"("dienstplanId", "fahrzeugPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "dp_zuweisung_dienstplanId_userId_key" ON "dp_zuweisung"("dienstplanId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "dp_tages_fahrzeug_dienstplanId_fahrzeugId_key" ON "dp_tages_fahrzeug"("dienstplanId", "fahrzeugId");

-- CreateIndex
CREATE UNIQUE INDEX "dp_push_subscription_endpoint_key" ON "dp_push_subscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "dp_schicht_konfiguration_schicht_key" ON "dp_schicht_konfiguration"("schicht");

-- AddForeignKey
ALTER TABLE "dp_user" ADD CONSTRAINT "dp_user_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "dp_abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_fahrzeug_position" ADD CONSTRAINT "dp_fahrzeug_position_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "dp_fahrzeug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_dienstplan" ADD CONSTRAINT "dp_dienstplan_abteilungId_fkey" FOREIGN KEY ("abteilungId") REFERENCES "dp_abteilung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_zuweisung" ADD CONSTRAINT "dp_zuweisung_dienstplanId_fkey" FOREIGN KEY ("dienstplanId") REFERENCES "dp_dienstplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_zuweisung" ADD CONSTRAINT "dp_zuweisung_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dp_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_zuweisung" ADD CONSTRAINT "dp_zuweisung_fahrzeugPositionId_fkey" FOREIGN KEY ("fahrzeugPositionId") REFERENCES "dp_fahrzeug_position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_zuweisung" ADD CONSTRAINT "dp_zuweisung_sonderfunktionId_fkey" FOREIGN KEY ("sonderfunktionId") REFERENCES "dp_sonderfunktion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_tages_fahrzeug" ADD CONSTRAINT "dp_tages_fahrzeug_dienstplanId_fkey" FOREIGN KEY ("dienstplanId") REFERENCES "dp_dienstplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_tages_fahrzeug" ADD CONSTRAINT "dp_tages_fahrzeug_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "dp_fahrzeug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_dienstplan_aenderung" ADD CONSTRAINT "dp_dienstplan_aenderung_dienstplanId_fkey" FOREIGN KEY ("dienstplanId") REFERENCES "dp_dienstplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_push_subscription" ADD CONSTRAINT "dp_push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dp_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
