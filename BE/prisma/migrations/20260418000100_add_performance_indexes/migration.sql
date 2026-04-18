CREATE INDEX "HouseMembership_houseId_isActive_userId_idx"
ON "HouseMembership"("houseId", "isActive", "userId");

CREATE INDEX "Expense_houseId_monthKey_status_idx"
ON "Expense"("houseId", "monthKey", "status");

CREATE INDEX "MonthlySettlement_houseId_monthKey_idx"
ON "MonthlySettlement"("houseId", "monthKey");
