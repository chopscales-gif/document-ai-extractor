import type { DocStatus } from "@/db/schema";

const chip = "inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[0.8125rem] font-semibold";

/** Where a document stands. One still waiting is either ready to approve or needs a look. */
export function StatusChip({ status, clean }: { status: DocStatus; clean: boolean }) {
  if (status === "approved") return <span className={`${chip} border-accent bg-accent text-white`}>Approved</span>;
  if (status === "rejected") return <span className={`${chip} border-flag/40 bg-flag-tint text-flag`}>Rejected</span>;
  if (clean) return <span className={`${chip} border-accent/40 bg-accent-tint text-accent-deep`}>Ready to approve</span>;
  return <span className={`${chip} border-transparent bg-mark text-ink`}>Needs a look</span>;
}
