-- AlterTable
ALTER TABLE "dp_fahrzeug" ADD COLUMN     "parentFahrzeugId" TEXT;

-- AddForeignKey
ALTER TABLE "dp_fahrzeug" ADD CONSTRAINT "dp_fahrzeug_parentFahrzeugId_fkey" FOREIGN KEY ("parentFahrzeugId") REFERENCES "dp_fahrzeug"("id") ON DELETE SET NULL ON UPDATE CASCADE;
