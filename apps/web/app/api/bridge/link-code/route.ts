import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, formatCode, sha256 } from "@/lib/security";
import { z } from "zod";

const schema = z.object({ uuid: z.string().uuid() });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const player = await prisma.player.findUnique({ where: { minecraftUuid: parsed.data.uuid } });
  if (!player) return NextResponse.json({ error: "player_not_registered" }, { status: 404 });
  const since = new Date(Date.now() - 60_000);
  if (await prisma.linkCode.count({ where: { playerId: player.id, createdAt: { gte: since } } }) >= 3) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const raw = randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
  await prisma.linkCode.create({ data: { codeHash: sha256(raw), playerId: player.id, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  return NextResponse.json({ code: formatCode(raw), expiresInSeconds: 600 });
}
