import type { DocStatus } from "@/db/schema";

/**
 * Where a document stands. A decision that has been made is a rubber stamp.
 * One still waiting is either ticked as ready or highlighted as needing a look.
 */
export function StatusChip({ status, clean }: { status: DocStatus; clean: boolean }) {
  if (status === "approved") return <span className="stamp text-pencil">Approved</span>;
  if (status === "rejected") return <span className="stamp text-flag">Rejected</span>;
  if (clean)
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] bg-pencil-tint px-2 py-0.5 text-sm font-semibold text-pencil">
        <Tick ok className="size-3.5" />
        Ready to approve
      </span>
    );
  return <span className="mark whitespace-nowrap text-sm font-semibold">Needs a look</span>;
}

/** A pencil tick for a check that passed, a cross for one that did not. */
export function Tick({ ok, className = "" }: { ok: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {ok ? <path d="M2.5 9 6 12.5 13.5 3.5" /> : <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />}
    </svg>
  );
}
