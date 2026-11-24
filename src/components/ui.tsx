/** A tick for a check that passed, a cross for one that did not. */
export function Tick({ ok, className = "" }: { ok: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {ok ? <path d="M2.5 9 6 12.5 13.5 3.5" /> : <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />}
    </svg>
  );
}
