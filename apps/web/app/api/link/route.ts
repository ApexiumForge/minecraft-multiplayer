import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCode, randomToken, sha256 } from "@/lib/security";
import { z } from "zod";

const schema = z.object({ code: z.string().min(8).max(12) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  const codeHash = sha256(normalizeCode(parsed.data.code));
  const rawToken = randomToken();
  const session = await prisma.$transaction(async tx => {
    const code = await tx.linkCode.findUnique({ where: { codeHash } });
    if (!code || code.usedAt || code.expiresAt <= new Date() || code.attempts >= 5) throw new Error("INVALID_CODE");
    const consumed = await tx.linkCode.updateMany({ where: { id: code.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date(), attempts: { increment: 1 } } });
    if (consumed.count !== 1) throw new Error("INVALID_CODE");
    return tx.session.create({ data: { playerId: code.playerId, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000) } });
  }).catch(() => null);
  if (!session) return NextResponse.json({ error: "invalid_or_expired_code" }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("skyblock_session", rawToken, { httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge: 30 * 24 * 60 * 60 });
  return response;
}
