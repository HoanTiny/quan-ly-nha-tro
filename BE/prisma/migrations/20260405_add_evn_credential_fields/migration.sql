DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'EvnCredential'
          AND column_name = 'maDiemDo'
    ) THEN
        ALTER TABLE "EvnCredential" ADD COLUMN "maDiemDo" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'EvnCredential'
          AND column_name = 'maDonVi'
    ) THEN
        ALTER TABLE "EvnCredential" ADD COLUMN "maDonVi" TEXT;
    END IF;
END $$;

ALTER TABLE "EvnCredential"
DROP COLUMN IF EXISTS "shareWithMembers";
