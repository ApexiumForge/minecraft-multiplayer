import { ChallengeKind, Prisma, PrismaClient } from "@prisma/client";

export async function recordChallengeProgress(db: PrismaClient, minecraftUuid: string, key: string, value: number) {
  return db.$transaction(async tx => {
    const player = await tx.player.findUniqueOrThrow({ where: { minecraftUuid } });
    const challenge = await tx.challengeDefinition.findUniqueOrThrow({ where: { key } });
    if (!challenge.enabled || value < 0) throw new Error("UNAVAILABLE");
    const periodKey = challenge.kind === ChallengeKind.LONG_TERM ? "lifetime" : new Date().toISOString().slice(0, 10);
    const progress = await tx.challengeProgress.upsert({
      where: { playerId_challengeId_periodKey: { playerId: player.id, challengeId: challenge.id, periodKey } },
      update: { progress: Math.max(0, value), completedAt: value >= challenge.targetValue ? new Date() : undefined },
      create: { playerId: player.id, challengeId: challenge.id, periodKey, progress: Math.max(0, value), completedAt: value >= challenge.targetValue ? new Date() : undefined },
    });
    if (value < challenge.targetValue || progress.rewardedAt) return { progress, rewarded: false };
    const won = await tx.challengeProgress.updateMany({ where: { id: progress.id, rewardedAt: null }, data: { rewardedAt: new Date(), completedAt: progress.completedAt ?? new Date() } });
    if (won.count !== 1) return { progress, rewarded: false };
    const wallet = await tx.wallet.update({ where: { playerId: player.id }, data: { balance: { increment: challenge.coinReward }, version: { increment: 1 } } });
    await tx.ledgerEntry.create({ data: { walletId: wallet.id, type: "CHALLENGE", amount: challenge.coinReward, balanceAfter: wallet.balance, idempotencyKey: `challenge:${progress.id}`, referenceType: "ChallengeProgress", referenceId: progress.id } });
    return { progress: await tx.challengeProgress.findUniqueOrThrow({ where: { id: progress.id } }), rewarded: true, balance: wallet.balance };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
