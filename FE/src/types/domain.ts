export type UserRole = "admin" | "member";
export type PaymentGateway = "MANUAL" | "VIETQR" | "VNPAY" | "MOMO" | "ZALOPAY";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "MANUAL_REVIEW";

export type BillStatus =
  | "draft"
  | "issued"
  | "pending_payment"
  | "paid"
  | "overdue"
  | "rejected";

export type Room = {
  id: string;
  houseId?: string;
  code?: string;
  name: string;
  capacity?: number;
  floor?: number | null;
  occupied?: boolean;
  activeMembers?: number;
};

export type Member = {
  id: string;
  membershipId?: string;
  fullName: string;
  email: string;
  phone?: string;
  roomId?: string;
  roomName?: string;
  role?: "OWNER" | "MANAGER" | "TENANT";
  isActive?: boolean;
};

export type Bill = {
  id: string;
  roomId: string;
  roomName?: string;
  memberId: string;
  memberName?: string;
  amount: number;
  totalPaid?: number;
  balance?: number;
  dueDate: string;
  status: BillStatus;
  month?: number;
  year?: number;
  monthKey?: string;
  version?: number;
  periodLabel?: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  houseId?: string | null;
  houseRoles?: Record<string, "OWNER" | "MANAGER" | "TENANT">;
  accessToken: string;
};

export type PaymentProofUploadPayload = {
  settlementLineId: string;
  payerUserId: string;
  payeeUserId?: string;
  amount: number;
  gateway: PaymentGateway;
  transactionRef?: string;
  proofUrl?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  amount: number;
  gateway: PaymentGateway | "STRIPE";
  status: PaymentStatus | "SUCCEEDED" | "CANCELLED" | "REFUNDED";
  proofUrl?: string | null;
  transactionRef?: string | null;
  paidAt?: string | null;
  memberName?: string;
  roomName?: string;
  settlementLineId?: string;
  monthKey?: string;
  payeeUserId?: string | null;
  payeeName?: string | null;
};

export type BillDetail = Bill & {
  memberEmail: string;
  items: Array<{
    expenseId: string;
    title: string;
    category: string;
    expenseDate: string;
    shareAmount: number;
    receiptImageUrl?: string | null;
  }>;
  payees: Array<{
    userId: string;
    fullName: string;
    amount: number;
    paidAmount: number;
    balance: number;
    qrImageUrl?: string | null;
    receiverName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    transferContent: string;
    items: Array<{
      expenseId: string;
      title: string;
      category: string;
      expenseDate: string;
      shareAmount: number;
      receiptImageUrl?: string | null;
    }>;
  }>;
  payments: PaymentRecord[];
};

export type PaymentQrResponse = {
  settlementLineId: string;
  amount: number;
  content: string;
  qrPayload: string | null;
  qrImageUrl?: string | null;
  receiverName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
};

export type PaymentAccountSettings = {
  id?: string | null;
  houseId: string;
  accountName: string;
  bankName?: string;
  bankBin?: string;
  accountNumber?: string;
  staticQrImageUrl?: string | null;
  previewQrImageUrl?: string | null;
  supportsDynamicQr?: boolean;
};

export type DemoContext = {
  houseId: string;
  roomId: string;
  ownerId: string;
  memberId: string;
  ownerMembershipId: string;
  memberMembershipId: string;
  month: number;
  year: number;
  ownerEmail: string;
  memberEmail: string;
};

export type ExpenseRecord = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  amount: number;
  expenseDate: string;
  monthKey: string;
  receiptImageUrl?: string | null;
  payerName?: string;
  participantCount?: number;
};

export type SettlementRecord = {
  id: string;
  monthKey: string;
  status: string;
  totalExpense: number;
  totalPaid: number;
  itemsCount: number;
};
