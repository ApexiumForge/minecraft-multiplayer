import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PurchaseButton } from "./purchase-button";

export default async function ShopPage(){
  const player=await currentPlayer();if(!player)redirect("/link");
  const items=await prisma.catalogItem.findMany({where:{enabled:true},orderBy:[{category:"asc"},{buyPrice:"asc"}]});
  const categories=Map.groupBy(items,item=>item.category);
  return <main className="economy-page"><section className="economy-shell"><header className="economy-header"><div><p className="eyebrow">PLAYER ECONOMY</p><h1>Buy Shop</h1><p>Hi, {player.lastKnownName}. Balance: <strong>{player.wallet?.balance??0} Coins</strong></p></div><nav><Link href="/sell">Sell</Link><Link href="/history">History</Link><Link href="/">Home</Link></nav></header>
    {[...categories].map(([category,products])=><section key={category}><h2>{category}</h2><div className="product-grid">{products.map(item=><article className="shop-product" key={item.id}><h3>{item.displayName}</h3><p>{item.quantity} items · {item.buyPrice} Coins</p><PurchaseButton slug={item.slug} label={item.slug==="cobblestone"?`Buy ${item.quantity}`:"Coming after live verification"} disabled={item.slug!=="cobblestone"}/></article>)}</div></section>)}
    <p><small>Only the proven cobblestone purchase is live. Other categories remain locked until individually verified.</small></p></section></main>
}
