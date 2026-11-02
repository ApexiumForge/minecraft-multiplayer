import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentPlayer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createSale } from "@/lib/sale-service";

const schema = z.object({ slug: z.string().min(1).max(80), packs: z.number().int().min(1).max(16) });

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_LIVE_SELLING !== "true") return NextResponse.json({ error: "selling_disabled" }, { status: 503 });
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = request.headers.get("idempotency-key");
  if (!key || key.length < 16 || key.length > 100) return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    return NextResponse.json(await createSale(prisma, player.id, parsed.data.slug, parsed.data.packs, key), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    return NextResponse.json({ error: message === "IDEMPOTENCY_CONFLICT" ? "idempotency_conflict" : "sale_unavailable" }, { status: message === "IDEMPOTENCY_CONFLICT" ? 409 : 400 });
  }
}
