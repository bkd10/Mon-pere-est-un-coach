// E-mails transactionnels. Avec SMTP_URL, envoi réel ; sinon l'e-mail est seulement journalisé (EmailLog) et la page Conformité le signale.
import nodemailer from "nodemailer";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { LEGAL } from "@/content/legal";

export const mailEnabled = () => Boolean(process.env.SMTP_URL);
const base = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function unsubscribeToken(userId: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev").update(`unsub:${userId}`).digest("base64url").slice(0, 32);
}
export const unsubscribeUrl = (userId: string) => `${base()}/desinscription?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

export async function sendEmail(o: { userId?: string; to: string; subject: string; text: string; kind: string; marketing?: boolean }) {
  // Pied de message : coordonnées de l'éditeur ; désinscription en un clic sur tout message non indispensable.
  const footer = [`—`, `${LEGAL.brand}${LEGAL.company ? ` · ${LEGAL.company}` : ""}${LEGAL.address ? ` · ${LEGAL.address}` : ""}`,
    o.marketing && o.userId ? `Ne plus recevoir ces e-mails : ${unsubscribeUrl(o.userId)}` : `Gérer mes préférences : ${base()}/app/parametres`].join("\n");
  const body = `${o.text}\n\n${footer}`;
  let sent = false;
  if (mailEnabled()) {
    try {
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({ from: process.env.MAIL_FROM || LEGAL.email, to: o.to, subject: o.subject, text: body,
        headers: o.marketing && o.userId ? { "List-Unsubscribe": `<${unsubscribeUrl(o.userId)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined });
      sent = true;
    } catch (e) { console.error("mail", e); }
  }
  await db.emailLog.create({ data: { to: o.to, subject: o.subject, body, kind: o.kind, sent } });
  return sent;
}
