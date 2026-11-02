export type SaleState = "PENDING" | "CLAIMED" | "PREPARED" | "APPLIED" | "COMPLETED" | "AMBIGUOUS";
export type SaleEvent = "claim" | "prepare" | "remove" | "credit" | "release" | "recover";

export function transitionSale(state: SaleState, event: SaleEvent): SaleState {
  const transitions: Record<string, SaleState> = {
    "PENDING:claim": "CLAIMED", "CLAIMED:prepare": "PREPARED", "CLAIMED:release": "PENDING",
    "PREPARED:remove": "APPLIED", "PREPARED:recover": "AMBIGUOUS",
    "APPLIED:credit": "COMPLETED", "APPLIED:recover": "APPLIED",
    "COMPLETED:credit": "COMPLETED", "AMBIGUOUS:recover": "AMBIGUOUS",
  };
  const next = transitions[`${state}:${event}`];
  if (!next) throw new Error(`Unsafe sale transition ${state}:${event}`);
  return next;
}

export function saleRecoveryAction(state: SaleState) {
  if (state === "PREPARED") return "QUARANTINE" as const;
  if (state === "APPLIED") return "CREDIT_ONLY" as const;
  return "NONE" as const;
}
