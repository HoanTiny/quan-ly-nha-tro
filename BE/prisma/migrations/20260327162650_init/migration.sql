-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "HouseRole" AS ENUM ('OWNER', 'MANAGER', 'TENANT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ELECTRIC', 'WATER', 'INTERNET', 'RENT', 'REPAIR', 'SHARED_FOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "SplitMethod" AS ENUM ('EQUAL', 'BY_AMOUNT', 'BY_WEIGHT', 'BY_ROOM');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'MOMO', 'ZALOPAY', 'VNPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "globalRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardingHouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardingHouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "floor" INTEGER,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseMembership" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT,
    "role" "HouseRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HouseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "receiptImageUrl" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "monthKey" TEXT NOT NULL,
    "splitMethod" "SplitMethod" NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "payerUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "weight" DECIMAL(10,2),
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySettlement" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'OPEN',
    "totalExpense" DECIMAL(18,2) NOT NULL,
    "totalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementItem" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL,
    "paidByUserAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementPayment" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "payeeUserId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "proofImageUrl" TEXT,
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SettlementPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "houseId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "BoardingHouse_code_key" ON "BoardingHouse"("code");

-- CreateIndex
CREATE INDEX "Room_houseId_idx" ON "Room"("houseId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_houseId_code_key" ON "Room"("houseId", "code");

-- CreateIndex
CREATE INDEX "HouseMembership_houseId_role_isActive_idx" ON "HouseMembership"("houseId", "role", "isActive");

-- CreateIndex
CREATE INDEX "HouseMembership_roomId_idx" ON "HouseMembership"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseMembership_houseId_userId_key" ON "HouseMembership"("houseId", "userId");

-- CreateIndex
CREATE INDEX "Expense_houseId_monthKey_category_idx" ON "Expense"("houseId", "monthKey", "category");

-- CreateIndex
CREATE INDEX "Expense_houseId_expenseDate_idx" ON "Expense"("houseId", "expenseDate");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_membershipId_idx" ON "ExpenseAllocation"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_membershipId_key" ON "ExpenseAllocation"("expenseId", "membershipId");

-- CreateIndex
CREATE INDEX "MonthlySettlement_houseId_status_idx" ON "MonthlySettlement"("houseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySettlement_houseId_monthKey_key" ON "MonthlySettlement"("houseId", "monthKey");

-- CreateIndex
CREATE INDEX "SettlementItem_membershipId_netAmount_idx" ON "SettlementItem"("membershipId", "netAmount");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementItem_settlementId_membershipId_key" ON "SettlementItem"("settlementId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementPayment_idempotencyKey_key" ON "SettlementPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SettlementPayment_houseId_settlementId_membershipId_idx" ON "SettlementPayment"("houseId", "settlementId", "membershipId");

-- CreateIndex
CREATE INDEX "SettlementPayment_membershipId_payeeUserId_status_idx" ON "SettlementPayment"("membershipId", "payeeUserId", "status");

-- CreateIndex
CREATE INDEX "PaymentAccount_houseId_provider_isActive_idx" ON "PaymentAccount"("houseId", "provider", "isActive");

-- CreateIndex
CREATE INDEX "Notification_houseId_status_scheduledAt_idx" ON "Notification"("houseId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseMembership" ADD CONSTRAINT "HouseMembership_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseMembership" ADD CONSTRAINT "HouseMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseMembership" ADD CONSTRAINT "HouseMembership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "HouseMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "MonthlySettlement_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "MonthlySettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "HouseMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "MonthlySettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "HouseMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "BoardingHouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
