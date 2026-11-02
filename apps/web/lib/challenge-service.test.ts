import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { recordChallengeProgress } from "./challenge-service";

const dbPath=path.resolve(process.cwd(),"prisma","dev.db").replaceAll("\\","/");const db=new PrismaClient({datasourceUrl:`file:${dbPath}`});const uuid="00000000-0000-4000-8000-000000000005";let playerId="";
beforeAll(async()=>{const p=await db.player.upsert({where:{minecraftUuid:uuid},update:{},create:{minecraftUuid:uuid,lastKnownName:"ChallengeTest"}});playerId=p.id;await db.wallet.upsert({where:{playerId},update:{balance:0,version:0},create:{playerId,balance:0}})});
afterAll(async()=>{await db.ledgerEntry.deleteMany({where:{wallet:{playerId}}});await db.challengeProgress.deleteMany({where:{playerId}});await db.wallet.deleteMany({where:{playerId}});await db.player.deleteMany({where:{id:playerId}});await db.$disconnect()});
describe("once-only gameplay rewards",()=>{
  it("does not reward incomplete progress",async()=>{const result=await recordChallengeProgress(db,uuid,"gather-cobble-64",63);expect(result.rewarded).toBe(false);expect((await db.wallet.findUniqueOrThrow({where:{playerId}})).balance).toBe(0)});
  it("credits exactly once under concurrent completion",async()=>{await Promise.allSettled([recordChallengeProgress(db,uuid,"gather-cobble-64",64),recordChallengeProgress(db,uuid,"gather-cobble-64",64)]);expect((await db.wallet.findUniqueOrThrow({where:{playerId}})).balance).toBe(60);expect(await db.ledgerEntry.count({where:{referenceType:"ChallengeProgress",wallet:{playerId}}})).toBe(1)});
  it("pays a configured BentoBox challenge only once",async()=>{await recordChallengeProgress(db,uuid,"bskyblock_cobblegenerator",1);await recordChallengeProgress(db,uuid,"bskyblock_cobblegenerator",2);expect((await db.wallet.findUniqueOrThrow({where:{playerId}})).balance).toBe(100);expect(await db.ledgerEntry.count({where:{referenceType:"ChallengeProgress",wallet:{playerId}}})).toBe(2)});
});
