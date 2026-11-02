import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, randomToken, sha256 } from "@/lib/security";
import { z } from "zod";
const schema = z.object({ onlineUuids: z.array(z.string().uuid()).max(100) });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.ENABLE_LIVE_PURCHASES !== "true") return NextResponse.json({ job: null });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || parsed.data.onlineUuids.length === 0) return NextResponse.json({ job: null });
  const candidates = await prisma.deliveryJob.findMany({ where: { status: "PENDING", purchase: { player: { minecraftUuid: { in: parsed.data.onlineUuids } } } }, include: { purchase: { include: { player: true, catalogItem: true } } }, orderBy: { createdAt: "asc" }, take: 5 });
  for (const candidate of candidates) {
    const token = randomToken();
    const claimed = await prisma.deliveryJob.updateMany({ where: { id: candidate.id, status: "PENDING" }, data: { status: "CLAIMED", claimTokenHash: sha256(token), claimedAt: new Date(), attemptCount: { increment: 1 } } });
    if (claimed.count === 1) return NextResponse.json({ job: { operationId: candidate.operationId, claimToken: token, playerUuid: candidate.purchase.player.minecraftUuid, material: candidate.purchase.catalogItem.material, amount: candidate.purchase.catalogItem.quantity * candidate.purchase.quantity } });
  }
  return NextResponse.json({ job: null });
}
