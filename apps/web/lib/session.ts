import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { sha256 } from "./security";

export async function currentPlayer() {
  const token = (await cookies()).get("skyblock_session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { player: { include: { wallet: true } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session.player;
}
