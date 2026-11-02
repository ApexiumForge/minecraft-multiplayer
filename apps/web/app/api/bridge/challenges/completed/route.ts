import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bridgeAuthorized } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { recordChallengeProgress } from "@/lib/challenge-service";

const schema=z.object({uuid:z.string().uuid(),challengeId:z.string().regex(/^bskyblock_[a-z0-9_-]+$/),completionCount:z.number().int().min(1).max(100000),admin:z.boolean()});
export async function POST(request:NextRequest){
  if(!bridgeAuthorized(request.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});
  if(process.env.ENABLE_LIVE_CHALLENGE_REWARDS!=="true")return NextResponse.json({enabled:false});
  const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"invalid_request"},{status:400});
  if(parsed.data.admin)return NextResponse.json({rewarded:false,reason:"admin_completion"});
  try{return NextResponse.json(await recordChallengeProgress(prisma,parsed.data.uuid,parsed.data.challengeId,parsed.data.completionCount));}
  catch{return NextResponse.json({rewarded:false,reason:"unconfigured_challenge"});}
}
