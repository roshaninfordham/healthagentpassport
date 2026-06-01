export type PaymentResult = {
  mode: "mock" | "mpp" | "x402";
  status: "paid" | "free" | "challenge" | "skipped";
  costMicros: number;
  receiptId?: string;
};

export async function handlePaymentForApiCall(input: {
  agentId: string;
  path: string;
  route: string;
}): Promise<PaymentResult> {
  const mode = process.env.PAYMENT_MODE || "mock";

  if (mode === "mock") {
    return {
      mode: "mock",
      status: "paid",
      costMicros: 1000,
      receiptId: `mock-receipt-${input.agentId}-${Date.now()}`
    };
  }

  return {
    mode: mode === "mpp" ? "mpp" : "x402",
    status: "skipped",
    costMicros: 0
  };
}
