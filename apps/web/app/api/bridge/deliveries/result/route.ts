import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, sha256 } from "@/lib/security";
import { z } from "zod";
const schema = z.object({ operationId: z.string().min(10), claimToken: z.string().min(20), result: z.enum(["APPLIED", "AMBIGUOUS", "RELEASE"]), journalId: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const job = await prisma.deliveryJob.findUnique({ where: { operationId: parsed.data.operationId }, include: { purchase: true } });
  if (!job || !job.claimTokenHash || job.claimTokenHash !== sha256(parsed.data.claimToken)) return NextResponse.json({ error: "invalid_claim" }, { status: 409 });
  if (job.status === "COMPLETED" && parsed.data.result === "APPLIED") return NextResponse.json({ ok: true, idempotent: true });
  await prisma.$transaction(async tx => {
    if (parsed.data.result === "RELEASE") {
      await tx.deliveryJob.updateMany({ where: { id: job.id, status: "CLAIMED" }, data: { status: "PENDING", claimTokenHash: null, claimedAt: null, failureCode: "PLAYER_OFFLINE_OR_FULL" } });
      return;
    }
    if (parsed.data.result === "AMBIGUOUS") {
      await tx.deliveryJob.update({ where: { id: job.id }, data: { status: "AMBIGUOUS", bridgeJournalId: parsed.data.journalId, failureCode: "CRASH_BOUNDARY_AMBIGUOUS" } });
      await tx.purchase.update({ where: { id: job.purchaseId }, data: { status: "AMBIGUOUS" } });
      return;
    }
    await tx.deliveryJob.update({ where: { id: job.id }, data: { status: "COMPLETED", appliedAt: job.appliedAt ?? new Date(), completedAt: new Date(), bridgeJournalId: parsed.data.journalId } });
    await tx.purchase.update({ where: { id: job.purchaseId }, data: { status: "COMPLETED" } });
  });
  return NextResponse.json({ ok: true });
}
