"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
export default function Submit({ children, className = "btn-primary w-full", pendingText = "Un instant…", confirm }: { children: ReactNode; className?: string; pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className} onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}>{pending ? pendingText : children}</button>;
}
