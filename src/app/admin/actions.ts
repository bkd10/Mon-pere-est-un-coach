"use server";
// Actions du back-office. Chaque action vérifie la permission du rôle et laisse une trace dans le journal.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PlanTier, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, requirePerm } from "@/lib/auth";
import { DEFAULT_RULES } from "@/lib/engine";
import { CATEGORIES } from "@/content/taxonomy";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, d = 0) => { const n = Math.round(Number(str(f, k).replace(",", "."))); return Number.isFinite(n) ? n : d; };
const lines = (f: FormData, k: string) => str(f, k).split("\n").map((s) => s.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function saveExercise(f: FormData) {
  const admin = await requirePerm("content");
  const id = str(f, "id");
  const name = str(f, "name");
  if (!name || !CATEGORIES.some((c) => c.key === str(f, "category")) || lines(f, "steps").length < 2) redirect(`/admin/exercices/${id || "nouveau"}?e=${encodeURIComponent("Nom, catégorie et au moins deux étapes sont obligatoires.")}`);
  const ageMin = Math.min(18, Math.max(4, int(f, "ageMin", 4))), ageMax = Math.min(18, Math.max(ageMin, int(f, "ageMax", 18)));
  const data = {
    name, category: str(f, "category"), ageMin, ageMax, level: str(f, "level") || "debutant", difficulty: Math.min(5, Math.max(1, int(f, "difficulty", 1))),
    objective: str(f, "objective"), skill: str(f, "skill"), why: str(f, "why"), durationMin: Math.min(20, Math.max(2, int(f, "durationMin", 5))), reps: str(f, "reps"),
    equipment: f.getAll("equipment").map(String), space: str(f, "space") || "moyen", indoorOk: f.get("indoorOk") === "on", parentRole: str(f, "parentRole") || "observe", intensity: Math.min(3, Math.max(1, int(f, "intensity", 2))),
    bodyAreas: f.getAll("bodyAreas").map(String), safety: str(f, "safety"), steps: lines(f, "steps"), mistakes: lines(f, "mistakes"), corrections: lines(f, "corrections"),
    variantEasy: str(f, "variantEasy"), variantMedium: str(f, "variantMedium"), variantHard: str(f, "variantHard"), successCriteria: str(f, "successCriteria"), recoverySec: Math.min(180, Math.max(0, int(f, "recoverySec", 30))),
    diagram: { kind: str(f, "diagramKind") || "free", n: int(f, "diagramN", 0) || undefined, caption: str(f, "diagramCaption") }, metricKey: str(f, "metricKey") || null,
    isFree: f.get("isFree") === "on", published: f.get("published") === "on", validatedBy: str(f, "validatedBy") || null, videoUrl: /^https:\/\//.test(str(f, "videoUrl")) ? str(f, "videoUrl") : null,
  };
  if (id) await db.exercise.update({ where: { id }, data });
  else { let slug = slugify(name); if (await db.exercise.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36).slice(-4); await db.exercise.create({ data: { slug, ...data } }); }
  await audit(admin.id, id ? "exercise_updated" : "exercise_created", name);
  revalidatePath("/admin/exercices");
  redirect("/admin/exercices?ok=1");
}
export async function deleteExercise(f: FormData) {
  const admin = await requirePerm("content");
  const e = await db.exercise.delete({ where: { id: str(f, "id") } });
  await audit(admin.id, "exercise_deleted", e.slug);
  redirect("/admin/exercices?ok=1");
}

export async function saveGuide(f: FormData) {
  const admin = await requirePerm("content");
  const id = str(f, "id"), title = str(f, "title");
  if (!title || !str(f, "body")) redirect(`/admin/guides/${id || "nouveau"}?e=${encodeURIComponent("Titre et contenu obligatoires.")}`);
  const data = { title, theme: str(f, "theme") || "accompagner", kind: str(f, "kind") || "article", summary: str(f, "summary"), body: str(f, "body"), actions: lines(f, "actions"), readMin: Math.max(1, int(f, "readMin", 3)), isFree: f.get("isFree") === "on", published: f.get("published") === "on" };
  if (id) await db.guide.update({ where: { id }, data });
  else {
    let slug = slugify(title); if (await db.guide.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36).slice(-4);
    await db.guide.create({ data: { slug, ...data } });
    if (data.published && f.get("notify") === "on") {
      const users = await db.user.findMany({ where: { role: "PARENT" }, select: { id: true, notifPrefs: true } });
      const targets = users.filter((u) => { const p = (u.notifPrefs ?? {}) as Record<string, unknown>; return p.frequency === "normal" && p.guide !== false; });
      if (targets.length) await db.notification.createMany({ data: targets.map((u) => ({ userId: u.id, kind: "guide", title: "Nouveau guide parental", body: title, href: `/app/guide/${slug}` })) });
    }
  }
  await audit(admin.id, id ? "guide_updated" : "guide_created", title);
  redirect("/admin/guides?ok=1");
}
export async function deleteGuide(f: FormData) {
  const admin = await requirePerm("content");
  await db.guide.delete({ where: { id: str(f, "id") } });
  await audit(admin.id, "guide_deleted");
  redirect("/admin/guides?ok=1");
}

export async function savePlan(f: FormData) {
  const admin = await requirePerm("billing");
  const tier = str(f, "tier") as PlanTier;
  const euros = (k: string) => Math.max(0, Math.round(Number(str(f, k).replace(",", ".")) * 100) || 0);
  await db.plan.update({ where: { tier }, data: { name: str(f, "name"), tagline: str(f, "tagline"), monthlyCents: tier === "DECOUVERTE" ? 0 : euros("monthly"), yearlyCents: tier === "DECOUVERTE" ? 0 : euros("yearly"), trialDays: Math.min(60, Math.max(0, int(f, "trialDays", 0))), features: lines(f, "features"), active: tier === "DECOUVERTE" ? true : f.get("active") === "on" } });
  await audit(admin.id, "plan_updated", tier);
  revalidatePath("/");
  redirect("/admin/offres?ok=1");
}

export async function saveRule(f: FormData) {
  const admin = await requirePerm("rules");
  const key = str(f, "key");
  const def = DEFAULT_RULES.find((r) => r.key === key);
  if (!def) redirect("/admin/regles");
  const params: Record<string, number> = {};
  for (const [k, dflt] of Object.entries(def!.params as Record<string, number>)) { const v = Number(str(f, `p_${k}`).replace(",", ".")); params[k] = Number.isFinite(v) && v >= 0 ? v : dflt; }
  // Garde-fous : une règle de sécurité ne peut pas être désactivée ni assouplie au-delà de bornes raisonnables.
  if (key === "charge-hebdo") { params.max4to7 = Math.min(5, params.max4to7); params.max8to11 = Math.min(6, params.max8to11); params.max12plus = Math.min(7, params.max12plus); }
  if (key === "douleur") params.suspendDays = Math.max(5, params.suspendDays);
  if (key === "recuperation-match") params.restDaysAfterMatch = Math.max(1, Math.min(3, params.restDaysAfterMatch));
  if (key === "fatigue-forte") params.durationPct = Math.min(80, Math.max(30, params.durationPct));
  await db.aiRule.upsert({ where: { key }, update: { enabled: def!.locked ? true : f.get("enabled") === "on", params }, create: { key, label: def!.label, description: def!.description, locked: def!.locked, enabled: def!.locked ? true : f.get("enabled") === "on", params } });
  await audit(admin.id, "rule_updated", `${key} ${JSON.stringify(params)}`);
  redirect("/admin/regles?ok=1");
}

export async function setRole(f: FormData) {
  const admin = await requirePerm("rules"); // réservé aux administrateurs
  const id = str(f, "userId"), role = str(f, "role") as Role;
  if (id === admin.id || !["PARENT", "EDITOR", "MODERATOR", "SUPPORT", "ADMIN"].includes(role)) redirect("/admin/utilisateurs?e=1");
  await db.user.update({ where: { id }, data: { role } });
  await audit(admin.id, "role_changed", `${id} → ${role}`);
  redirect("/admin/utilisateurs?ok=1");
}
export async function grantTier(f: FormData) {
  const admin = await requirePerm("billing");
  const userId = str(f, "userId"), tier = str(f, "tier") as PlanTier, days = Math.min(366, Math.max(1, int(f, "days", 30)));
  await db.subscription.upsert({ where: { userId }, update: { tier, status: "ACTIVE", provider: "none", currentPeriodEnd: tier === "DECOUVERTE" ? null : new Date(Date.now() + days * 86400000), cancelAtPeriodEnd: tier !== "DECOUVERTE", trialEndsAt: null }, create: { userId, tier, status: "ACTIVE", currentPeriodEnd: tier === "DECOUVERTE" ? null : new Date(Date.now() + days * 86400000) } });
  await audit(admin.id, "tier_granted", `${userId} ${tier} ${days}j`);
  redirect("/admin/utilisateurs?ok=1");
}

export async function moderate(f: FormData) {
  const admin = await requirePerm("moderation");
  const id = str(f, "mediaId"), ok = str(f, "decision") === "approve";
  const m = await db.media.findUnique({ where: { id } });
  if (!m || m.status !== "PENDING" || !m.shareConsentAt) redirect("/admin/moderation");
  await db.media.update({ where: { id }, data: { status: ok ? "APPROVED" : "REJECTED", moderationNote: str(f, "note").slice(0, 200) || null, exerciseSlug: str(f, "exerciseSlug") || m!.exerciseSlug } });
  await db.notification.create({ data: { userId: m!.ownerId, kind: "goal", title: ok ? "Votre vidéo a été validée" : "Votre vidéo reste privée", body: ok ? "Merci ! Elle est maintenant visible dans la vidéothèque. Vous pouvez retirer votre accord à tout moment depuis l'album." : `Elle n'a pas été retenue pour la vidéothèque${str(f, "note") ? ` : ${str(f, "note")}` : ""}. Elle reste dans votre album privé.`, href: "/app/enfant/album" } });
  await audit(admin.id, ok ? "media_approved" : "media_rejected", id);
  redirect("/admin/moderation?ok=1");
}

export async function broadcast(f: FormData) {
  const admin = await requirePerm("rules");
  const title = str(f, "title").slice(0, 80), body = str(f, "body").slice(0, 300), kind = ["challenge", "guide", "report"].includes(str(f, "kind")) ? str(f, "kind") : "challenge";
  if (!title || !body) redirect("/admin/notifications?e=1");
  const users = await db.user.findMany({ where: { role: "PARENT" }, select: { id: true, notifPrefs: true } });
  const targets = users.filter((u) => { const p = (u.notifPrefs ?? {}) as Record<string, unknown>; return p.frequency !== "aucune" && p[kind] !== false && (p.frequency !== "minimale" || kind === "report"); });
  if (targets.length) await db.notification.createMany({ data: targets.map((u) => ({ userId: u.id, kind, title, body, href: str(f, "href").startsWith("/app") ? str(f, "href") : null })) });
  await audit(admin.id, "broadcast", `${title} → ${targets.length}`);
  redirect(`/admin/notifications?ok=${targets.length}`);
}

export async function saveProduct(f: FormData) {
  const admin = await requirePerm("billing");
  const id = str(f, "id");
  const price = str(f, "price").replace(",", ".");
  const url = str(f, "buyUrl");
  await db.product.update({ where: { id }, data: {
    name: str(f, "name"), tagline: str(f, "tagline"), contents: lines(f, "contents"), sort: int(f, "sort", 0), active: f.get("active") === "on",
    priceCents: price === "" || !Number.isFinite(Number(price)) ? null : Math.max(0, Math.round(Number(price) * 100)),
    buyUrl: /^https:\/\//.test(url) ? url : null,
  } });
  // Le produit devient commandable : les parents qui avaient demandé à être prévenus le sont.
  if (/^https:\/\//.test(url)) {
    const p = await db.product.findUnique({ where: { id }, include: { interests: true } });
    if (p && p.interests.length) await db.notification.createMany({ data: p.interests.map((i) => ({ userId: i.userId, kind: "guide", title: `${p.name} est disponible`, body: "Le matériel que vous attendiez peut être commandé.", href: "/app/boutique" })) });
    if (p) await db.productInterest.deleteMany({ where: { productId: id } });
  }
  await audit(admin.id, "product_updated", id);
  redirect("/admin/boutique?ok=1");
}

// Demandes de suppression reçues sans connexion : à traiter sous un mois après vérification de l'identité.
export async function handleDeletion(f: FormData) {
  const admin = await requirePerm("users");
  const r = await db.deletionRequest.findUnique({ where: { id: str(f, "id") } });
  if (!r) redirect("/admin/moderation");
  if (str(f, "decision") === "delete") {
    const u = await db.user.findUnique({ where: { email: r!.email } });
    if (u && u.role === "PARENT") {
      const { rm } = await import("node:fs/promises");
      await rm(`storage/${u.id}`, { recursive: true, force: true });
      await db.user.delete({ where: { id: u.id } });
    }
  }
  await db.deletionRequest.update({ where: { id: r!.id }, data: { status: str(f, "decision") === "delete" ? "traitee" : "rejetee", handledAt: new Date() } });
  await audit(admin.id, "deletion_request_handled", str(f, "decision"));
  redirect("/admin/moderation?ok=1");
}

// Signalement : retrait du contenu avec exposé des motifs à son auteur (DSA art. 17), ou classement.
export async function handleReport(f: FormData) {
  const admin = await requirePerm("moderation");
  const r = await db.contentReport.findUnique({ where: { id: str(f, "id") } });
  if (!r) redirect("/admin/moderation");
  if (str(f, "decision") === "remove") {
    const m = await db.media.findUnique({ where: { id: r!.mediaId } });
    if (m) {
      const motif = str(f, "note") || "contenu contraire aux conditions générales";
      await db.media.update({ where: { id: m.id }, data: { status: "REJECTED", moderationNote: motif } });
      await db.notification.create({ data: { userId: m.ownerId, kind: "report", title: "Votre vidéo a été retirée de la vidéothèque", body: `Suite à un signalement, elle n'est plus visible par les autres familles. Motif : ${motif}. Elle reste dans votre album privé. Vous pouvez contester cette décision en répondant à notre adresse de contact.`, href: "/app/enfant/album" } });
    }
  }
  await db.contentReport.updateMany({ where: { mediaId: r!.mediaId, status: "ouvert" }, data: { status: "traite" } });
  await audit(admin.id, "report_handled", `${r!.mediaId} ${str(f, "decision")}`);
  redirect("/admin/moderation?ok=1");
}
