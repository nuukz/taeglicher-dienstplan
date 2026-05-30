-- AlterTable
ALTER TABLE "dp_dienstplan" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "dp_dienstplan_aenderung" ADD COLUMN     "snapshot" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "dp_dienstplan_aenderung" ADD CONSTRAINT "dp_dienstplan_aenderung_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dp_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
