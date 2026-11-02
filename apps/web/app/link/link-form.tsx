"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function LinkForm() {
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");const data=new FormData(event.currentTarget);const response=await fetch("/api/link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:data.get("code")})});setBusy(false);if(response.ok){router.push("/shop");router.refresh()}else setMessage("Invalid or expired code. Generate a new one in Minecraft.")}
  return <form onSubmit={submit}><label htmlFor="code">Link code</label><input id="code" name="code" placeholder="ABCD-EFGH" autoComplete="one-time-code" required/><button disabled={busy}>{busy?"Linking…":"Link account"}</button>{message&&<p role="alert">{message}</p>}</form>
}
