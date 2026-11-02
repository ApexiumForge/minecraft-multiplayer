"use client";
import { useState } from "react";

export function SaleButton({slug,label,disabled}:{slug:string;label:string;disabled:boolean}){
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function sell(){if(disabled||busy)return;setBusy(true);setMessage("");try{const response=await fetch("/api/sale",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({slug,packs:1})});const body=await response.json();setMessage(response.ok?`Sale ${body.id} is ${body.status}. Keep Minecraft open while it is verified.`:`Sale unavailable: ${body.error??"Unknown error"}`);}catch{setMessage("Sale request failed. Check history before retrying.");}finally{setBusy(false)}}
  return <><button onClick={sell} disabled={disabled||busy}>{busy?"Submitting...":label}</button>{message&&<p role="status">{message}</p>}</>;
}
