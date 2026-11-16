// Droit à la portabilité : export complet des données du compte au format JSON.
import { getUser, audit } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const full = await db.user.findUnique({ where: { id: user.id }, include: {
    subscription: true, payments: true, notifications: true, chatMessages: true, budgets: true, guideReads: { include: { guide: { select: { title: true } } } },
    media: { select: { id: true, kind: true, title: true, mimeType: true, sizeBytes: true, status: true, shareConsentAt: true, createdAt: true } },
    children: { include: { sessions: { include: { feedback: true } }, events: true, measurements: true, devEntries: true, badges: true, challenges: true, milestones: true, reports: true } },
  } });
  if (!full) return new Response("Introuvable", { status: 404 });
  const { passwordHash: _p, failedLogins: _f, lockedUntil: _l, ...account } = full;
  const data = { exportedAt: new Date().toISOString(), format: "mon-duo-foot-export-v1", ...account, children: full.children.map((c) => ({ ...c, devEntries: c.devEntries.map((d) => ({ date: d.date, ...(decryptJson<Record<string, unknown>>(d.payload) ?? {}) })) })) };
  await audit(user.id, "data_export");
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}
