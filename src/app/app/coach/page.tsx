import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { clearChat } from "@/app/actions";
import { aiAvailable } from "@/lib/coach";
import { entOf } from "@/lib/services";
import CoachChat from "@/components/CoachChat";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Coach IA" };
export default async function Page() {
  const { user, child } = await getActiveChild();
  const ent = entOf(user);
  const [history, exs, used] = await Promise.all([
    db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.exercise.findMany({ where: { published: true }, select: { slug: true, name: true } }),
    db.chatMessage.count({ where: { userId: user.id, role: "user", createdAt: { gte: ent.tier === "DECOUVERTE" ? new Date(0) : new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
  ]);
  const left = Math.max(0, ent.coachQuota - used);
  const suggestions = [`Que faire travailler à ${child.nickname} cette semaine ?`, "Il manque de confiance, comment l'aider ?", "Il n'arrive pas à faire des jongles, quel exercice choisir ?", "Il est fatigué après son match, que faire ?", "Comment organiser une séance de 15 minutes ?", "Est-ce utile de prendre un coach individuel ?"];
  return (
    <div>
      <PageHead title="Coach parental IA" sub={`Tient compte de l'âge et des séances de ${child.nickname}. Réponses simples, sans jargon.`} />
      <div role="note" className="mb-3 rounded-2xl bg-sky-100 p-3 text-sm text-ink-700"><b>Vous échangez avec une intelligence artificielle</b> (modèle Claude, d'Anthropic), pas avec un éducateur. Ses réponses peuvent contenir des erreurs. N'indiquez ni nom, ni adresse, ni détail médical : le prénom et les données de santé de votre enfant ne lui sont jamais transmis.</div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-500">
        <span>{ent.coachQuota >= 300 ? "Questions illimitées" : `${left} question${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}${ent.tier === "DECOUVERTE" ? " (essai)" : " ce mois-ci"}`}{aiAvailable() ? "" : " · mode fiches"}</span>
        {history.length > 0 && <form action={clearChat}><button className="font-bold text-coral-600">Effacer la conversation</button></form>}
      </div>
      <CoachChat initial={history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))} suggestions={suggestions} names={Object.fromEntries(exs.map((e) => [e.slug, e.name]))} nickname={child.nickname} />
      <p className="muted mb-4">Le coach conseille les parents ; il ne remplace ni un éducateur diplômé, ni un médecin, ni un professionnel de santé. Il ne recommande que des exercices des fiches de l'application.</p>
    </div>
  );
}
