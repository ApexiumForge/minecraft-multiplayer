import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { completeSale, createSale } from "./sale-service";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replaceAll("\\", "/");
const db = new PrismaClient({ datasourceUrl: `file:${dbPath}` });
const uuid = "00000000-0000-4000-8000-000000000004";
let playerId = "";

beforeAll(async () => {
  const player = await db.player.upsert({ where: { minecraftUuid: uuid }, update: {}, create: { minecraftUuid: uuid, lastKnownName: "Phase4Test" } });
  playerId = player.id;
  await db.wallet.upsert({ where: { playerId }, update: { balance: 0, version: 0 }, create: { playerId, balance: 0 } });
});
afterEach(async () => {
  const sales = await db.saleJob.findMany({ where: { playerId }, select: { id: true } });
  await db.ledgerEntry.deleteMany({ where: { referenceType: "SaleJob", referenceId: { in: sales.map(s => s.id) } } });
  await db.saleJob.deleteMany({ where: { playerId } });
  await db.wallet.update({ where: { playerId }, data: { balance: 0, version: 0 } });
});
afterAll(async () => {
  await db.ledgerEntry.deleteMany({ where: { wallet: { playerId } } });
  await db.wallet.deleteMany({ where: { playerId } });
  await db.player.deleteMany({ where: { id: playerId } });
  await db.$disconnect();
});

describe("transactional sale credit", () => {
  it("creates one unpaid job for an idempotent request", async () => {
    const first = await createSale(db, playerId, "cobblestone", 1, "sale-idempotency-key-0001");
    const retry = await createSale(db, playerId, "cobblestone", 1, "sale-idempotency-key-0001");
    expect(retry.id).toBe(first.id);
    expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(0);
    expect(await db.ledgerEntry.count({ where: { referenceId: first.id } })).toBe(0);
  });

  it("credits exactly once after a claimed removal", async () => {
    const sale = await createSale(db, playerId, "cobblestone", 1, "sale-idempotency-key-0002");
    await db.saleJob.update({ where: { id: sale.id }, data: { status: "CLAIMED" } });
    await completeSale(db, sale.operationId, sale.operationId);
    await completeSale(db, sale.operationId, sale.operationId);
    expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(20);
    expect(await db.ledgerEntry.count({ where: { referenceId: sale.id } })).toBe(1);
  });

  it("refuses credit before a claim", async () => {
    const sale = await createSale(db, playerId, "wheat", 1, "sale-idempotency-key-0003");
    await expect(completeSale(db, sale.operationId, sale.operationId)).rejects.toThrow("UNSAFE_STATE");
    expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(0);
  });

  it("never double credits concurrent acknowledgements", async () => {
    const sale = await createSale(db, playerId, "oak-logs", 1, "sale-idempotency-key-0004");
    await db.saleJob.update({ where: { id: sale.id }, data: { status: "CLAIMED" } });
    await Promise.allSettled([completeSale(db, sale.operationId, sale.operationId), completeSale(db, sale.operationId, sale.operationId)]);
    expect((await db.wallet.findUniqueOrThrow({ where: { playerId } })).balance).toBe(45);
    expect(await db.ledgerEntry.count({ where: { referenceId: sale.id } })).toBe(1);
  });
});
