import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SaleButton } from "./sale-button";

export default async function SellPage(){
  const player=await currentPlayer();if(!player)redirect("/link");
  const [items,snapshot]=await Promise.all([prisma.catalogItem.findMany({where:{enabled:true,sellPrice:{gt:0}},orderBy:[{category:"asc"},{sellPrice:"asc"}]}),prisma.inventorySnapshot.findUnique({where:{playerId:player.id}})]);
  const counts:Record<string,number>=snapshot?JSON.parse(snapshot.countsJson):{};const live=process.env.ENABLE_LIVE_SELLING==="true";
  return <main className="economy-page"><section className="economy-shell"><header className="economy-header"><div><p className="eyebrow">SAFE RESOURCE EXCHANGE</p><h1>Sell Resources</h1><p>Balance: <strong>{player.wallet?.balance??0} Coins</strong></p></div><nav><Link href="/shop">Buy</Link><Link href="/history">History</Link></nav></header>
    {!live&&<div className="safety-banner">Live selling is disabled while removal and crash-recovery tests run. No items can be removed.</div>}
    <div className="product-grid">{items.map(item=>{const available=counts[item.material]??0;return <article className="shop-product" key={item.id}><h2>{item.displayName}</h2><p>Have {available} · sell {item.quantity} for {item.sellPrice} Coins</p><SaleButton slug={item.slug} label={live?`Sell ${item.quantity}`:"Safety testing"} disabled={!live||available<item.quantity}/></article>})}</div>
    <p><small>Inventory is a recent snapshot. Minecraft revalidates and removes the exact quantity before any credit. Ambiguous removals are quarantined.</small></p></section></main>;
}
