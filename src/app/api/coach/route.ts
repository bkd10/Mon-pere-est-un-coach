import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getUser, track } from "@/lib/auth";
import { db } from "@/lib/db";
import { coachStream } from "@/lib/coach";
import { entOf } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return new Response("Non connecté", { status: 401 });
  const body = await req.json().catch(() => null) as { message?: string } | null;
  const message = String(body?.message ?? "").trim().slice(0, 1500);
  if (!message) return new Response("Message vide", { status: 400 });
  const ent = entOf(user);
  const since = ent.tier === "DECOUVERTE" ? new Date(0) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const used = await db.chatMessage.count({ where: { userId: user.id, role: "user", createdAt: { gte: since } } });
  if (used >= ent.coachQuota) return new Response(ent.tier === "DECOUVERTE" ? "Vous avez utilisé vos 3 questions d'essai. Le coach IA est inclus dans les offres Essentiel (10 questions par mois) et Premium (sans limite)." : "Vous avez atteint le nombre de questions de votre offre pour ce mois-ci.", { status: 402 });
  const childId = (await cookies()).get("pp_child")?.value;
  const child = user.children.find((c) => c.id === childId) ?? user.children[0] ?? null;
  const history = (await db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 })).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  await db.chatMessage.create({ data: { userId: user.id, childId: child?.id, role: "user", content: message } });
  await track("coach_question");
  const enc = new TextEncoder();
  let full = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of coachStream(message, history, child)) { full += chunk; controller.enqueue(enc.encode(chunk)); }
      } catch (e) {
        console.error("coach route", e);
        const msg = "Le coach est momentanément indisponible. Réessayez dans un instant.";
        full += msg; controller.enqueue(enc.encode(msg));
      } finally {
        if (full.trim()) await db.chatMessage.create({ data: { userId: user.id, childId: child?.id, role: "assistant", content: full } }).catch(() => {});
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
