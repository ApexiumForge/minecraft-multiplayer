import { ArrowRight, Coins, Pickaxe, ShieldCheck, Users } from "lucide-react";
const features = [
  { icon: Pickaxe, title: "Real islands", text: "BentoBox owns islands, teams, levels, and protection." },
  { icon: Coins, title: "Earned economy", text: "Personal wallets backed by an append-only SQLite ledger." },
  { icon: ShieldCheck, title: "Safe delivery", text: "Durable jobs stop retries when a crash leaves inventory ambiguous." },
];
export default function Home() { return <main>
  <nav className="nav shell"><div className="brand"><span className="brand-cube" /> SKYBLOCK LAN</div><div className="nav-links"><a href="#progression">Progression</a><a href="/link">Link account</a></div></nav>
  <section className="hero shell"><div className="eyebrow"><Users size={16}/> Built for your crew on the same LAN</div><h1>One tiny island.<br/><span>A world of rivalry.</span></h1><p>Classic cooperative SkyBlock with persistent islands, meaningful challenges, and a companion marketplace that changes what happens in Minecraft.</p><div className="actions"><a className="primary" href="/link">Link Minecraft <ArrowRight size={18}/></a><a className="secondary" href="#progression">Explore the game</a></div><div className="server-strip"><span className="pulse"/><div><strong>LAN SERVER</strong><small>The host address appears here after setup</small></div><code>:25565</code></div></section>
  <section className="features shell" id="progression">{features.map(({icon:Icon,title,text})=><article key={title}><Icon/><h2>{title}</h2><p>{text}</p></article>)}</section>
  <section className="roadmap shell"><div><small>01 · SURVIVE</small><h3>Wood, stone, and a first harvest</h3></div><div><small>02 · BUILD</small><h3>Trade resources and expand</h3></div><div><small>03 · COMPETE</small><h3>Levels, challenges, and rare ores</h3></div></section>
</main> }
