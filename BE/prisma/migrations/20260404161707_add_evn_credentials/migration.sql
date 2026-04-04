-- CreateTable
CREATE TABLE "EvnCredential" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "customerId" TEXT,
    "meterNumber" TEXT,
    "shareWithMembers" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvnCredential_houseId_isActive_idx" ON "EvnCredential"("houseId", "isActive");

-- CreateIndex
CREATE INDEX "EvnCredential_userId_idx" ON "EvnCredential"("userId");

-- AddForeignKey
ALTER TABLE "EvnCredential" ADD CONSTRAINT "EvnCredential_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
