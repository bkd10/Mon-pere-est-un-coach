// Diffusion des médias : propriétaire uniquement, ou tout abonné connecté si la vidéo a été approuvée après consentement.
import { NextRequest } from "next/server";
import { stat, open } from "node:fs/promises";
import path from "node:path";
import { getUser, can } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const m = await db.media.findUnique({ where: { id } });
  if (!m || !(m.ownerId === user.id || m.status === "APPROVED" || (m.status === "PENDING" && can(user.role, "moderation")))) return new Response("Introuvable", { status: 404 });
  const file = path.join(process.cwd(), "storage", m.storageKey);
  const st = await stat(file).catch(() => null);
  if (!st) return new Response("Introuvable", { status: 404 });
  const range = req.headers.get("range");
  let start = 0, end = st.size - 1, status = 200;
  if (range) { const mt = /bytes=(\d*)-(\d*)/.exec(range); if (mt) { start = mt[1] ? Number(mt[1]) : 0; end = mt[2] ? Math.min(Number(mt[2]), st.size - 1) : Math.min(start + 4 * 1024 * 1024, st.size - 1); status = 206; } }
  if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
  const fh = await open(file, "r");
  const stream = fh.createReadStream({ start, end, autoClose: true });
  const web = new ReadableStream({ start(c) { stream.on("data", (d) => c.enqueue(d)); stream.on("end", () => c.close()); stream.on("error", (e) => c.error(e)); }, cancel() { stream.destroy(); } });
  return new Response(web, { status, headers: { "Content-Type": m.mimeType, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${st.size}` } : {}), "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
