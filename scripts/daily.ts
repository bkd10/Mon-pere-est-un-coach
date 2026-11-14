// Tâche quotidienne (à planifier, ex. cron « 15 3 * * * npm run daily ») :
// 1. rappel avant reconduction des abonnements annuels (art. L215-1 code de la consommation) ;
// 2. purge selon les durées de conservation annoncées dans la politique de confidentialité.
import { PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import { RETENTION } from "../src/content/legal";
import { sendEmail } from "../src/lib/mail";

const db = new PrismaClient();
const monthsAgo = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };

async function main() {
  // 1. Rappel de reconduction : envoyé une fois, entre 3 mois et 1 mois avant le terme.
  const soon = await db.subscription.findMany({ where: { interval: "year", status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: { gte: new Date(Date.now() + 30 * 86400000), lte: new Date(Date.now() + 35 * 86400000) } }, include: { user: true } });
  let reminders = 0;
  for (const s of soon) {
    const key = `renouvellement-${s.currentPeriodEnd!.toISOString().slice(0, 10)}`;
    if (await db.notification.findFirst({ where: { userId: s.userId, kind: "report", body: { contains: key } } })) continue;
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(s.currentPeriodEnd!);
    const text = `Votre abonnement annuel sera reconduit automatiquement le ${date}. Si vous ne souhaitez pas le reconduire, vous pouvez le résilier dès maintenant, en quelques clics, depuis « Mon abonnement » : l'accès continuera jusqu'au ${date}.`;
    await db.notification.create({ data: { userId: s.userId, kind: "report", title: "Votre abonnement annuel arrive à échéance", body: `${text} (${key})`, href: "/app/abonnement" } });
    await sendEmail({ userId: s.userId, to: s.user.email, subject: "Votre abonnement annuel arrive à échéance", text: `Bonjour ${s.user.firstName},\n\n${text}`, kind: "rappel-reconduction" });
    reminders++;
  }
  // 2. Purges.
  const inactive = await db.user.findMany({ where: { role: "PARENT", OR: [{ lastSeenAt: { lt: monthsAgo(RETENTION.inactiveAccountMonths) } }, { lastSeenAt: null, createdAt: { lt: monthsAgo(RETENTION.inactiveAccountMonths) } }] }, select: { id: true } });
  for (const u of inactive) { await rm(`storage/${u.id}`, { recursive: true, force: true }); await db.user.delete({ where: { id: u.id } }); }
  const r = await Promise.all([
    db.chatMessage.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.chatMonths) } } }),
    db.notification.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.notificationMonths) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.auditMonths) } } }),
    db.emailLog.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.emailLogMonths) } } }),
    db.deletionRequest.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.deletionRequestMonths) } } }),
    db.payment.deleteMany({ where: { createdAt: { lt: monthsAgo(RETENTION.invoiceYears * 12) } } }),
  ]);
  await db.auditLog.create({ data: { action: "daily_run", detail: `rappels ${reminders}, comptes inactifs ${inactive.length}` } });
  console.log(`rappels : ${reminders} · comptes inactifs supprimés : ${inactive.length} · purges :`, r.map((x) => x.count).join(" / "));
}
main().finally(() => db.$disconnect());
