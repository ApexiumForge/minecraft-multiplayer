import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized } from "@/lib/security";
import { z } from "zod";

const bodySchema = z.object({ uuid: z.string().uuid(), name: z.string().regex(/^[A-Za-z0-9_]{1,16}$/), online: z.boolean() });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { uuid, name, online } = parsed.data;
  const result = await prisma.$transaction(async tx => {
    const player = await tx.player.upsert({ where: { minecraftUuid: uuid }, update: { lastKnownName: name, lastSeenAt: online ? new Date() : undefined }, create: { minecraftUuid: uuid, lastKnownName: name, lastSeenAt: online ? new Date() : undefined } });
    let wallet = await tx.wallet.findUnique({ where: { playerId: player.id } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { playerId: player.id, balance: 250 } });
      await tx.ledgerEntry.create({ data: { walletId: wallet.id, type: "STARTING_BALANCE", amount: 250, balanceAfter: 250, idempotencyKey: `start:${player.id}`, note: "Initial player balance" } });
    }
    return { playerId: player.id, balance: wallet.balance };
  });
  return NextResponse.json(result);
}
