import { requireUser } from "@/lib/auth";
import { entOf } from "@/lib/services";
import ChildForm from "@/components/ChildForm";
import { Notice, PageHead } from "@/components/ui";
import { redirect } from "next/navigation";

export const metadata = { title: "Profil de votre enfant" };
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const { e } = await searchParams;
  if (user.children.length >= entOf(user).maxChildren) redirect("/app/abonnement?e=" + encodeURIComponent("Votre offre ne permet pas d'ajouter un autre profil."));
  return (
    <div>
      <PageHead title={user.children.length ? "Ajouter un enfant" : `Bienvenue ${user.firstName} !`} sub="Quelques questions, puis nous construisons son parcours personnalisé." back={user.children.length ? "/app/enfant" : undefined} />
      {e && <Notice tone="warn">{e}</Notice>}
      <ChildForm />
    </div>
  );
}
