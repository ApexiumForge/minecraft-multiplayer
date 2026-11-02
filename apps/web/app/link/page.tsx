import { KeyRound } from "lucide-react";
import Link from "next/link";
import { LinkForm } from "./link-form";
export default function LinkPage() { return <main className="center-page"><section className="link-card"><div className="icon-box"><KeyRound/></div><p className="eyebrow">SECURE ACCOUNT LINK</p><h1>Connect Minecraft</h1><p>In Minecraft run <code>/shop link</code>, then enter the one-time code below. Codes expire after ten minutes and work once.</p><LinkForm/><Link href="/">← Back to home</Link></section></main> }
