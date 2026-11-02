import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bridgeAuthorized } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { recordChallengeProgress } from "@/lib/challenge-service";

const schema=z.object({uuid:z.string().uuid(),key:z.literal("gather-cobble-64"),value:z.number().int().min(0).max(100000000)});
export async function POST(request:NextRequest){if(!bridgeAuthorized(request.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});if(process.env.ENABLE_LIVE_CHALLENGE_REWARDS!=="true")return NextResponse.json({enabled:false});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"invalid_request"},{status:400});try{return NextResponse.json(await recordChallengeProgress(prisma,parsed.data.uuid,parsed.data.key,parsed.data.value));}catch{return NextResponse.json({error:"challenge_unavailable"},{status:400})}}
