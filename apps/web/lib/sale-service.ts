import { Prisma, PrismaClient } from "@prisma/client";
import { randomToken } from "./security";

export async function createSale(db: PrismaClient, playerId: string, slug: string, packs: number, idempotencyKey: string) {
  const existing = await db.saleJob.findUnique({ where: { idempotencyKey }, include: { catalogItem: true } });
  if (existing) {
    if (existing.playerId !== playerId || existing.catalogItem.slug !== slug || existing.quantity !== existing.catalogItem.quantity * packs) throw new Error("IDEMPOTENCY_CONFLICT");
    return existing;
  }
  return db.$transaction(async tx => {
    const repeated = await tx.saleJob.findUnique({ where: { idempotencyKey } });
    if (repeated) return repeated;
    const item = await tx.catalogItem.findUnique({ where: { slug } });
    if (!item?.enabled || item.sellPrice < 1 || item.buyPrice <= item.sellPrice) throw new Error("UNAVAILABLE");
    return tx.saleJob.create({ data: {
      playerId, catalogItemId: item.id, operationId: randomToken(18), idempotencyKey,
      quantity: item.quantity * packs, unitPrice: item.sellPrice, totalCredit: item.sellPrice * packs,
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function completeSale(db: PrismaClient, operationId: string, journalId: string) {
  return db.$transaction(async tx => {
    const sale = await tx.saleJob.findUniqueOrThrow({ where: { operationId } });
    if (sale.status === "COMPLETED") return sale;
    if (sale.status !== "CLAIMED" && sale.status !== "APPLIED") throw new Error("UNSAFE_STATE");
    const wallet = await tx.wallet.update({ where: { playerId: sale.playerId }, data: { balance: { increment: sale.totalCredit }, version: { increment: 1 } } });
    await tx.ledgerEntry.create({ data: {
      walletId: wallet.id, type: "SALE", amount: sale.totalCredit, balanceAfter: wallet.balance,
      idempotencyKey: `sale:${sale.id}`, referenceType: "SaleJob", referenceId: sale.id,
    }});
    return tx.saleJob.update({ where: { id: sale.id }, data: {
      status: "COMPLETED", appliedAt: sale.appliedAt ?? new Date(), completedAt: new Date(), bridgeJournalId: journalId,
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
