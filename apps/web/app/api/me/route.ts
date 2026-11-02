import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/session";
export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ uuid: player.minecraftUuid, name: player.lastKnownName, balance: player.wallet?.balance ?? 0 });
}
