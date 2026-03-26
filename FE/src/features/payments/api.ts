import { apiClient } from "@/lib/api/client";
import type {
  PaymentAccountSettings,
  PaymentProofUploadPayload,
  PaymentQrResponse
} from "@/types/domain";

export async function submitPaymentProof(payload: PaymentProofUploadPayload) {
  return apiClient.post("/payments/proof", payload);
}

export async function getPaymentQr(settlementLineId: string, payeeUserId?: string) {
  return apiClient.post<PaymentQrResponse>("/payments/qr", { settlementLineId, payeeUserId });
}

export async function getPaymentAccount(houseId: string) {
  return apiClient.get<PaymentAccountSettings>("/payments/account", { houseId });
}

export async function getMyPaymentAccount(houseId: string) {
  return apiClient.get<PaymentAccountSettings>("/payments/account/me", { houseId });
}

export async function savePaymentAccount(payload: PaymentAccountSettings) {
  return apiClient.put<PaymentAccountSettings>("/payments/account", payload);
}

export async function saveMyPaymentAccount(payload: PaymentAccountSettings) {
  return apiClient.put<PaymentAccountSettings>("/payments/account/me", payload);
}

export async function getPayments(houseId: string, status?: string) {
  const payments = await apiClient.get<any[]>("/payments", { houseId, status });

  return payments.map((payment) => ({
    id: payment.id,
    amount: Number(payment.amount),
    gateway: payment.provider,
    status: payment.status,
    proofUrl: payment.proofImageUrl ?? null,
    transactionRef: payment.providerRef ?? null,
    paidAt: payment.paidAt,
    memberName: payment.membership?.user?.fullName,
    roomName: payment.membership?.room?.name ?? payment.membership?.room?.code,
    settlementLineId: payment.membershipId,
    monthKey: payment.settlement?.monthKey,
    payeeUserId: payment.payeeUserId ?? null,
    payeeName: payment.payee?.fullName ?? null
  }));
}

export async function confirmPayment(paymentId: string) {
  return apiClient.patch(`/payments/${paymentId}/confirm`);
}
