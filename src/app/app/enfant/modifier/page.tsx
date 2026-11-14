import { getActiveChild } from "@/lib/auth";
import ChildForm from "@/components/ChildForm";
import { Notice, PageHead } from "@/components/ui";
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { child } = await getActiveChild();
  const { e } = await searchParams;
  return <div><PageHead title={`Profil de ${child.nickname}`} sub="Le programme est recalculé à chaque modification." back="/app/enfant" />{e && <Notice tone="warn">{e}</Notice>}<ChildForm child={child} /></div>;
}
