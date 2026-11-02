import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { createPurchase } from "./purchase-service";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replaceAll("\\", "/");
const db = new PrismaClient({ datasourceUrl: `file:${dbPath}` });
const uuid = "00000000-0000-4000-8000-000000000003";
let playerId = "";

beforeAll(async () => {
  const player = await db.player.upsert({ where: { minecraftUuid: uuid }, update: {}, create: { minecraftUuid: uuid, lastKnownName: "Phase3Test" } });
  playerId = player.id;
  await db.wallet.upsert({ where: { playerId }, update: { balance: 250, version: 0 }, create: { playerId, balance: 250 } });
});
afterEach(async () => {
  const purchases = await db.purchase.findMany({ where: { playerId }, select: { id: true } });
  const ids = purchases.map(p => p.id);
  await db.deliveryJob.deleteMany({ where: { purchaseId: { in: ids } } });
  await db.ledgerEntry.deleteMany({ where: { referenceType: "Purchase", referenceId: { in: ids } } });
  await db.purchase.deleteMany({ where: { playerId } });
  await db.wallet.update({ where: { playerId }, data: { balance: 250, version: 0 } });
});
afterAll(async () => {
  await db.ledgerEntry.deleteMany({ where: { wallet: { playerId } } });
  await db.wallet.deleteMany({ where: { playerId } });
  await db.player.deleteMany({ where: { id: playerId } });
  await db.$disconnect();
});

describe("transactional purchase persistence", () => {
  it("debits once and returns the same order for an idempotent retry", async () => {
    const key = "test-idempotency-key-0001";
    const first = await createPurchase(db, playerId, "cobblestone", 1, key);
    const retry = await createPurchase(db, playerId, "cobblestone", 1, key);
    expect(retry.id).toBe(first.id);
    expect(await db.wallet.findUniqueOrThrow({ where: { playerId } })).toMatchObject({ balance: 150, version: 1 });
    expect(await db.ledgerEntry.count({ where: { referenceId: first.id } })).toBe(1);
    expect(await db.deliveryJob.count({ where: { purchaseId: first.id } })).toBe(1);
  });

  it("never allows a wallet to overspend", async () => {
    await db.wallet.update({ where: { playerId }, data: { balance: 100 } });
    const attempts = await Promise.allSettled([
      createPurchase(db, playerId, "cobblestone", 1, "concurrent-purchase-key-a"),
      createPurchase(db, playerId, "cobblestone", 1, "concurrent-purchase-key-b"),
    ]);
    expect(attempts.filter(a => a.status === "fulfilled")).toHaveLength(1);
    expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(0);
    expect(await db.purchase.count({ where: { playerId } })).toBe(1);
  });
});
