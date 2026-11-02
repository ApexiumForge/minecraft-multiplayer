import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bridgeAuthorized } from "@/lib/security";
import { prisma } from "@/lib/prisma";

const schema = z.object({ uuid: z.string().uuid(), counts: z.record(z.string().regex(/^[A-Z0-9_]+$/), z.number().int().min(0).max(1000000)) });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const player = await prisma.player.findUnique({ where: { minecraftUuid: parsed.data.uuid } });
  if (!player) return NextResponse.json({ error: "player_not_registered" }, { status: 404 });
  await prisma.inventorySnapshot.upsert({ where: { playerId: player.id }, update: { countsJson: JSON.stringify(parsed.data.counts) }, create: { playerId: player.id, countsJson: JSON.stringify(parsed.data.counts) } });
  return NextResponse.json({ ok: true });
}
