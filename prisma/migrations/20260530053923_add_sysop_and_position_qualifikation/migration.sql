-- AlterEnum
ALTER TYPE "Rolle" ADD VALUE 'SYSOP';

-- CreateTable
CREATE TABLE "dp_position_qualifikation" (
    "positionId" TEXT NOT NULL,
    "qualifikationId" TEXT NOT NULL,

    CONSTRAINT "dp_position_qualifikation_pkey" PRIMARY KEY ("positionId","qualifikationId")
);

-- AddForeignKey
ALTER TABLE "dp_position_qualifikation" ADD CONSTRAINT "dp_position_qualifikation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "dp_fahrzeug_position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_position_qualifikation" ADD CONSTRAINT "dp_position_qualifikation_qualifikationId_fkey" FOREIGN KEY ("qualifikationId") REFERENCES "dp_qualifikation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
