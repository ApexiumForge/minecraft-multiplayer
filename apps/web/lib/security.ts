import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const normalizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formatCode = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 8)}`;

export function bridgeAuthorized(header: string | null) {
  const secret = process.env.BRIDGE_SECRET;
  if (!secret || secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
