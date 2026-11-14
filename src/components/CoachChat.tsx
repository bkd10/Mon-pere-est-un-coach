"use client";
import { useEffect, useRef, useState } from "react";
import { Rich } from "./ui";

type Msg = { role: "user" | "assistant"; content: string };
export default function CoachChat({ initial, suggestions, names, nickname }: { initial: Msg[]; suggestions: string[]; names: Record<string, string>; nickname: string }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  async function send(q: string) {
    const message = q.trim();
    if (!message || busy) return;
    setError(null); setBusy(true); setText("");
    setMsgs((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (!res.ok || !res.body) { setMsgs((m) => m.slice(0, -2)); setError(await res.text() || "Le coach est indisponible pour le moment."); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]); }
    } catch { setMsgs((m) => m.slice(0, -2)); setError("Connexion interrompue. Réessayez."); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="space-y-3" aria-live="polite">
        {msgs.length === 0 && (
          <div className="card"><p className="font-semibold">Bonjour ! Je connais le profil de {nickname} et ses dernières séances. Que voulez-vous savoir ?</p>
            <div className="mt-3 flex flex-col gap-2">{suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-2xl bg-ink-50 px-3 py-2.5 text-left text-sm font-semibold text-ink-700 hover:bg-pitch-50">{s}</button>)}</div></div>
        )}
        {msgs.map((m, i) => m.role === "user" ? <div key={i} className="ml-10 rounded-2xl rounded-br-md bg-pitch-600 px-4 py-2.5 text-[15px] text-white">{m.content}</div> : (
          <div key={i} className="mr-6 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[15px] shadow-card">{m.content ? <Rich text={m.content} names={names} /> : <span className="inline-flex gap-1" aria-label="Le coach réfléchit"><span className="h-2 w-2 animate-bounce rounded-full bg-ink-300" /><span className="h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:240ms]" /></span>}</div>
        ))}
        {error && <div role="alert" className="rounded-2xl bg-sun-100 p-3 text-sm font-semibold">{error} {error.includes("offre") && <a href="/app/abonnement" className="text-pitch-700 underline">Voir les offres</a>}</div>}
        <div ref={end} className="h-24" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="safe-b fixed inset-x-0 bottom-[68px] z-20 border-t border-ink-100 bg-white px-4 pt-2">
        <div className="mx-auto flex max-w-xl gap-2"><input value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="Votre question…" aria-label="Votre question au coach" className="input" /><button disabled={busy || !text.trim()} className="btn-primary shrink-0" aria-label="Envoyer">➤</button></div>
      </form>
    </div>
  );
}
