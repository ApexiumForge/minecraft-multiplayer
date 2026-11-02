import { Prisma, PrismaClient } from "@prisma/client";
import { randomToken } from "./security";

export async function createPurchase(db: PrismaClient, playerId: string, slug: string, packs: number, idempotencyKey: string) {
  const existing = await db.purchase.findUnique({ where: { idempotencyKey }, include: { delivery: true } });
  if (existing) {
    if (existing.playerId !== playerId) throw new Error("IDEMPOTENCY_CONFLICT");
    return existing;
  }
  return db.$transaction(async tx => {
    const repeated = await tx.purchase.findUnique({ where: { idempotencyKey }, include: { delivery: true } });
    if (repeated) return repeated;
    const item = await tx.catalogItem.findUnique({ where: { slug } });
    if (!item?.enabled || item.buyPrice <= item.sellPrice) throw new Error("UNAVAILABLE");
    const total = item.buyPrice * packs;
    const debited = await tx.wallet.updateMany({ where: { playerId, balance: { gte: total } }, data: { balance: { decrement: total }, version: { increment: 1 } } });
    if (debited.count !== 1) throw new Error("INSUFFICIENT_FUNDS");
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { playerId } });
    const created = await tx.purchase.create({ data: { playerId, catalogItemId: item.id, quantity: packs, unitPrice: item.buyPrice, totalPrice: total, idempotencyKey } });
    await tx.ledgerEntry.create({ data: { walletId: wallet.id, type: "PURCHASE", amount: -total, balanceAfter: wallet.balance, idempotencyKey: `purchase:${created.id}`, referenceType: "Purchase", referenceId: created.id } });
    return tx.purchase.update({ where: { id: created.id }, data: { delivery: { create: { operationId: randomToken(18) } } }, include: { delivery: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
