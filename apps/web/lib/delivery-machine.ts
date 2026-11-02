export type DeliveryState = "PENDING" | "CLAIMED" | "PREPARED" | "APPLIED" | "COMPLETED" | "AMBIGUOUS";
export type DeliveryEvent = "claim" | "prepare" | "apply" | "ack" | "recover" | "release";

export function transition(state: DeliveryState, event: DeliveryEvent): DeliveryState {
  const key = `${state}:${event}`;
  const transitions: Record<string, DeliveryState> = {
    "PENDING:claim": "CLAIMED",
    "CLAIMED:prepare": "PREPARED",
    "CLAIMED:release": "PENDING",
    "PREPARED:apply": "APPLIED",
    "PREPARED:recover": "AMBIGUOUS",
    "APPLIED:ack": "COMPLETED",
    "APPLIED:recover": "APPLIED",
    "COMPLETED:ack": "COMPLETED",
    "AMBIGUOUS:recover": "AMBIGUOUS",
  };
  const next = transitions[key];
  if (!next) throw new Error(`Unsafe delivery transition ${key}`);
  return next;
}

export function canMutateInventory(state: DeliveryState) { return state === "PREPARED"; }
export function recoveryAction(state: DeliveryState) {
  if (state === "PREPARED") return "QUARANTINE" as const;
  if (state === "APPLIED") return "ACK_ONLY" as const;
  return "NONE" as const;
}
