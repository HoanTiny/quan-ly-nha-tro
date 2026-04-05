-- AlterTable
ALTER TABLE "EvnCredential"
ADD COLUMN "maDiemDo" TEXT,
ADD COLUMN "maDonVi" TEXT;

-- DropColumn
ALTER TABLE "EvnCredential"
DROP COLUMN IF EXISTS "shareWithMembers";
