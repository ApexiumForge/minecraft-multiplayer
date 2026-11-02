import { ChallengeKind, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const catalog = [
  ["cobblestone","COBBLESTONE","Cobblestone","Blocks",64,100,20], ["oak-logs","OAK_LOG","Oak Logs","Farming",16,160,45],
  ["wheat","WHEAT","Wheat","Farming",32,160,40], ["iron-ingots","IRON_INGOT","Iron Ingots","Ores",8,480,120],
  ["gold-ingots","GOLD_INGOT","Gold Ingots","Ores",8,960,240], ["diamond","DIAMOND","Diamond","Rare",1,1500,350],
] as const;
async function main() {
  for (const [slug,material,displayName,category,quantity,buyPrice,sellPrice] of catalog) {
    if (buyPrice <= sellPrice) throw new Error(`Unsafe price loop: ${slug}`);
    await prisma.catalogItem.upsert({where:{slug},update:{material,displayName,category,quantity,buyPrice,sellPrice},create:{slug,material,displayName,category,quantity,buyPrice,sellPrice}});
  }
  for (const c of [
    {key:"gather-cobble-64",name:"Stone by Stone",description:"Gather 64 cobblestone",targetType:"MATERIAL_COLLECTED",targetValue:64,coinReward:60},
    {key:"harvest-wheat-32",name:"First Harvest",description:"Harvest 32 wheat",targetType:"CROP_HARVESTED",targetValue:32,coinReward:75},
    {key:"plant-saplings-10",name:"Forester",description:"Plant 10 saplings",targetType:"BLOCK_PLACED",targetValue:10,coinReward:50},
    {key:"bskyblock_cobblegenerator",name:"Cobble Stone Generator",description:"Complete the verified BentoBox Cobble Stone Generator challenge",targetType:"BENTOBOX_CHALLENGE",targetValue:1,coinReward:40},
  ]) await prisma.challengeDefinition.upsert({where:{key:c.key},update:{},create:{...c,kind:ChallengeKind.LONG_TERM}});
}
main().finally(()=>prisma.$disconnect());
