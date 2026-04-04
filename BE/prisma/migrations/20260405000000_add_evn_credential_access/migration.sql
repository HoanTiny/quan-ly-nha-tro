-- CreateTable
CREATE TABLE "EvnCredentialAccess" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByUserId" TEXT NOT NULL,

    CONSTRAINT "EvnCredentialAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvnCredentialAccess_credentialId_idx" ON "EvnCredentialAccess"("credentialId");

-- CreateIndex
CREATE INDEX "EvnCredentialAccess_userId_idx" ON "EvnCredentialAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EvnCredentialAccess_credentialId_userId_key" ON "EvnCredentialAccess"("credentialId", "userId");

-- AddForeignKey
ALTER TABLE "EvnCredentialAccess" ADD CONSTRAINT "EvnCredentialAccess_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "EvnCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvnCredentialAccess" ADD CONSTRAINT "EvnCredentialAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvnCredentialAccess" ADD CONSTRAINT "EvnCredentialAccess_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
