-- CreateTable
CREATE TABLE "dp_fahrzeug_dienstzeit" (
    "id" TEXT NOT NULL,
    "fahrzeugId" TEXT NOT NULL,
    "wochentag" INTEGER NOT NULL,
    "schicht" "SchichtTyp" NOT NULL,
    "imDienst" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dp_fahrzeug_dienstzeit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dp_fahrzeug_dienstzeit_fahrzeugId_wochentag_schicht_key" ON "dp_fahrzeug_dienstzeit"("fahrzeugId", "wochentag", "schicht");

-- AddForeignKey
ALTER TABLE "dp_fahrzeug_dienstzeit" ADD CONSTRAINT "dp_fahrzeug_dienstzeit_fahrzeugId_fkey" FOREIGN KEY ("fahrzeugId") REFERENCES "dp_fahrzeug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
