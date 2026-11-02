import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, sha256 } from "@/lib/security";
import { completeSale } from "@/lib/sale-service";

const schema = z.object({ operationId: z.string().min(10), claimToken: z.string().min(20), result: z.enum(["APPLIED", "AMBIGUOUS", "RELEASE"]), journalId: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  if (!bridgeAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const job = await prisma.saleJob.findUnique({ where: { operationId: parsed.data.operationId } });
  if (!job || !job.claimTokenHash || job.claimTokenHash !== sha256(parsed.data.claimToken)) return NextResponse.json({ error: "invalid_claim" }, { status: 409 });
  if (job.status === "COMPLETED" && parsed.data.result === "APPLIED") return NextResponse.json({ ok: true, idempotent: true });
  if (parsed.data.result === "RELEASE") {
    await prisma.saleJob.updateMany({ where: { id: job.id, status: "CLAIMED" }, data: { status: "PENDING", claimTokenHash: null, claimedAt: null, failureCode: "PLAYER_OFFLINE_OR_ITEMS_MISSING" } });
  } else if (parsed.data.result === "AMBIGUOUS") {
    await prisma.saleJob.update({ where: { id: job.id }, data: { status: "AMBIGUOUS", bridgeJournalId: parsed.data.journalId, failureCode: "REMOVAL_BOUNDARY_AMBIGUOUS" } });
  } else {
    await completeSale(prisma, job.operationId, parsed.data.journalId);
  }
  return NextResponse.json({ ok: true });
}
