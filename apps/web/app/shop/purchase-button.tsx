
"use client";

import { useState } from "react";

function createUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function PurchaseButton({ slug = "cobblestone", label = "Buy", disabled = false }: { slug?: string; label?: string; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function buy() {
    if (busy || disabled) return;

    setBusy(true);
    setMessage("");

    try {
      const key = createUUID();

      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          slug,
          packs: 1,
        }),
      });

      const body = await response.json();

      setMessage(
        response.ok
          ? `Order ${body.id} is ${body.status}.`
          : `Purchase unavailable: ${body.error ?? "Unknown error"}`
      );
    } catch (error) {
      console.error("Purchase failed:", error);
      setMessage("Purchase failed. Check the order status before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={buy} disabled={busy || disabled}>
        {busy ? "Submitting..." : label}
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
