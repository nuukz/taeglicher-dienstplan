-- CreateEnum
CREATE TYPE "AbwesenheitsGrund" AS ENUM ('KRANK', 'URLAUB', 'FORTBILDUNG', 'FREI', 'SONSTIGES');

-- CreateTable
CREATE TABLE "dp_abwesenheit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "schicht" "SchichtTyp",
    "grund" "AbwesenheitsGrund" NOT NULL,
    "notiz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dp_abwesenheit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dp_abwesenheit_userId_datum_schicht_key" ON "dp_abwesenheit"("userId", "datum", "schicht");

-- AddForeignKey
ALTER TABLE "dp_abwesenheit" ADD CONSTRAINT "dp_abwesenheit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dp_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
