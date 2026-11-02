import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, randomToken, sha256 } from "@/lib/security";

const schema = z.object({ onlineUuids: z.array(z.string().uuid()).max(100) });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.ENABLE_LIVE_SELLING !== "true") return NextResponse.json({ job: null });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || parsed.data.onlineUuids.length === 0) return NextResponse.json({ job: null });
  const candidates = await prisma.saleJob.findMany({ where: { status: "PENDING", player: { minecraftUuid: { in: parsed.data.onlineUuids } } }, include: { player: true, catalogItem: true }, orderBy: { createdAt: "asc" }, take: 5 });
  for (const candidate of candidates) {
    const token = randomToken();
    const claimed = await prisma.saleJob.updateMany({ where: { id: candidate.id, status: "PENDING" }, data: { status: "CLAIMED", claimTokenHash: sha256(token), claimedAt: new Date(), attemptCount: { increment: 1 } } });
    if (claimed.count === 1) return NextResponse.json({ job: { operationId: candidate.operationId, claimToken: token, playerUuid: candidate.player.minecraftUuid, material: candidate.catalogItem.material, amount: candidate.quantity } });
  }
  return NextResponse.json({ job: null });
}
