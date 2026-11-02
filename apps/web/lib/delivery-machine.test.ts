import { describe, expect, it } from "vitest";
import { canMutateInventory, recoveryAction, transition } from "./delivery-machine";

describe("crash-consistent delivery state machine", () => {
  it("completes the only valid mutation path", () => {
    let state = transition("PENDING", "claim");
    state = transition(state, "prepare");
    expect(canMutateInventory(state)).toBe(true);
    state = transition(state, "apply");
    state = transition(state, "ack");
    expect(state).toBe("COMPLETED");
  });
  it("quarantines a crash at the ambiguous physical boundary", () => {
    expect(recoveryAction("PREPARED")).toBe("QUARANTINE");
    expect(transition("PREPARED", "recover")).toBe("AMBIGUOUS");
  });
  it("retries acknowledgement but never inventory after APPLIED", () => {
    expect(recoveryAction("APPLIED")).toBe("ACK_ONLY");
    expect(transition("APPLIED", "recover")).toBe("APPLIED");
  });
  it("releases an offline/full claim without mutation", () => {
    expect(transition("CLAIMED", "release")).toBe("PENDING");
    expect(canMutateInventory("CLAIMED")).toBe(false);
  });
  it("rejects duplicate or out-of-order mutations", () => {
    expect(() => transition("APPLIED", "apply")).toThrow(/Unsafe/);
    expect(() => transition("PENDING", "apply")).toThrow(/Unsafe/);
  });
});
