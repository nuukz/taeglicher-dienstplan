-- CreateTable
CREATE TABLE "dp_qualifikation" (
    "id" TEXT NOT NULL,
    "kuerzel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "farbe" TEXT NOT NULL DEFAULT '#6b7280',

    CONSTRAINT "dp_qualifikation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_user_qualifikation" (
    "userId" TEXT NOT NULL,
    "qualifikationId" TEXT NOT NULL,

    CONSTRAINT "dp_user_qualifikation_pkey" PRIMARY KEY ("userId","qualifikationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "dp_qualifikation_kuerzel_key" ON "dp_qualifikation"("kuerzel");

-- AddForeignKey
ALTER TABLE "dp_user_qualifikation" ADD CONSTRAINT "dp_user_qualifikation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dp_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dp_user_qualifikation" ADD CONSTRAINT "dp_user_qualifikation_qualifikationId_fkey" FOREIGN KEY ("qualifikationId") REFERENCES "dp_qualifikation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
