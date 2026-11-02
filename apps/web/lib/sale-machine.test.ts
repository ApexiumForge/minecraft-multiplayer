import { describe, expect, it } from "vitest";
import { saleRecoveryAction, transitionSale } from "./sale-machine";

describe("safe sale state machine", () => {
  it("does not credit before removal", () => expect(() => transitionSale("CLAIMED", "credit")).toThrow());
  it("quarantines the removal crash boundary", () => expect(saleRecoveryAction("PREPARED")).toBe("QUARANTINE"));
  it("retries only credit after durable removal", () => expect(saleRecoveryAction("APPLIED")).toBe("CREDIT_ONLY"));
  it("makes completion idempotent", () => expect(transitionSale("COMPLETED", "credit")).toBe("COMPLETED"));
  it("releases an unmodified claim", () => expect(transitionSale("CLAIMED", "release")).toBe("PENDING"));
});
