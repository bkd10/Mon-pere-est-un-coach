"use server";
// Actions accessibles sans connexion : mot de passe oublié, achat d'une carte cadeau.
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, hashPassword, track } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { giftPriceCents, startGiftCheckout } from "@/lib/billing";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const base = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function requestPasswordReset(f: FormData) {
  const email = str(f, "email").toLowerCase();
  const user = z.string().email().safeParse(email).success ? await db.user.findUnique({ where: { email } }) : null;
  // Réponse identique que le compte existe ou non : on ne révèle pas qui est inscrit.
  if (user && (await db.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600000) } } })) < 3) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordReset.create({ data: { userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 3600000) } });
    await sendEmail({ userId: user.id, to: user.email, subject: "Réinitialiser votre mot de passe", kind: "mot-de-passe", text: `Bonjour ${user.firstName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n${base()}/reinitialiser?t=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.` });
  }
  redirect("/mot-de-passe-oublie?ok=1");
}

export async function resetPassword(f: FormData) {
  const token = str(f, "t"), password = String(f.get("password") ?? "");
  if (password.length < 8) redirect(`/reinitialiser?t=${encodeURIComponent(token)}&e=${encodeURIComponent("Le mot de passe doit contenir au moins 8 caractères.")}`);
  const r = await db.passwordReset.findUnique({ where: { tokenHash: sha(token) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) redirect("/mot-de-passe-oublie?e=" + encodeURIComponent("Ce lien n'est plus valable. Demandez-en un nouveau."));
  await db.user.update({ where: { id: r!.userId }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
  await db.passwordReset.updateMany({ where: { userId: r!.userId, usedAt: null }, data: { usedAt: new Date() } });
  await audit(r!.userId, "password_reset");
  redirect("/connexion?e=" + encodeURIComponent("Mot de passe modifié. Vous pouvez vous connecter."));
}

export async function buyGift(f: FormData) {
  const email = str(f, "email").toLowerCase();
  if (!z.string().email().safeParse(email).success) redirect("/cadeau?e=" + encodeURIComponent("Indiquez une adresse e-mail valide : le code cadeau y sera envoyé."));
  if (f.get("cgv") !== "on") redirect("/cadeau?e=" + encodeURIComponent("Merci d'accepter les conditions générales de vente."));
  const code = "DUO-" + randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})(.{5})/, "$1-$2");
  const gift = await db.giftCode.create({ data: { code, amountCents: giftPriceCents(), purchaserEmail: email } });
  await track("gift_started");
  const res = await startGiftCheckout(gift.id);
  redirect(res.url ?? `/cadeau/merci?g=${gift.id}`);
}
