"use client";
export default function PrintButton() { return <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm print:hidden">🖨️ PDF</button>; }
