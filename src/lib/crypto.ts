// Chiffrement applicatif AES-256-GCM des données sensibles (carnet de développement).
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length === 32) return k;
  }
  if (process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY manquante ou invalide (32 octets en base64).");
  return createHash("sha256").update(process.env.AUTH_SECRET || "dev-only-key").digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptJson<T>(payload: string): T | null {
  try {
    const [v, iv, tag, enc] = payload.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}
