import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentPlayer } from "@/lib/session";
import { createPurchase } from "@/lib/purchase-service";
import { z } from "zod";

const schema = z.object({ slug: z.literal("cobblestone"), packs: z.number().int().min(1).max(4) });
export async function POST(request: NextRequest) {
  if (process.env.ENABLE_LIVE_PURCHASES !== "true") return NextResponse.json({ error: "purchases_disabled" }, { status: 503 });
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const purchase = await createPurchase(prisma, player.id, parsed.data.slug, parsed.data.packs, idempotencyKey);
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    if (message === "IDEMPOTENCY_CONFLICT") return NextResponse.json({ error: "idempotency_conflict" }, { status: 409 });
    return NextResponse.json({ error: message === "INSUFFICIENT_FUNDS" ? "insufficient_funds" : "purchase_failed" }, { status: message === "INSUFFICIENT_FUNDS" ? 409 : 400 });
  }
}
