import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { reason } from "@/lib/flag";
import { fmtAmount } from "@/lib/money";
import { KIND_LABEL } from "@/lib/samples";
import { approveCleanAction } from "@/server/actions";
import { inbox, type InboxRow } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Inbox" };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One list of what needs a person, each with its reason in a line. What passed everything is folded into one line. */
export default async function InboxPage() {
  const rows = await inbox(await getCtx());
  const waiting = rows.filter((row) => row.status === "needs_review");
  const look = waiting.filter((row) => !row.assessment.clean);
  const ready = waiting.filter((row) => row.assessment.clean);
  const done = rows.filter((row) => row.status !== "needs_review");

  return (
    <main className="mx-auto w-full max-w-[76rem] flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="text-ink-3">Tuesday, November 10</p>
      <h1 className="mt-2 max-w-[24ch] text-[clamp(2.125rem,4.4vw,3.375rem)] font-extrabold leading-[1.07] tracking-[-0.03em]">
        {look.length ? `${count(look.length, "document needs", "documents need")} you.` : waiting.length ? "Nothing needs you." : "The inbox is clear."}{" "}
        {ready.length > 0 && <span className="text-ink-3">{ready.length === 1 ? "1 is ready to approve." : `${ready.length} are ready to approve together.`}</span>}
        {!waiting.length && <span className="text-ink-3">Approved documents are in the export.</span>}
      </h1>

      {look.length > 0 && (
        <ul className="panel mt-9 overflow-hidden">
          {look.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      )}

      {ready.length > 0 && (
        <div className="panel mt-5 overflow-hidden" data-tour="ready">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 px-5 py-5 sm:px-7">
            <span aria-hidden className="size-3 shrink-0 rounded-full bg-ok shadow-[0_0_0_5px_var(--color-ok-bg)]" />
            <p className="min-w-0 flex-1 basis-56 text-lg">
              <b className="font-bold">{ready.length === 1 ? "1 passed every check." : `${ready.length} passed every check.`}</b> <span className="text-ink-2">Nothing was flagged on {ready.length === 1 ? "it" : "them"}.</span>
            </p>
            <ActionButton action={approveCleanAction} pendingLabel="Approving" className="max-sm:w-full">
              {ready.length === 1 ? "Approve it" : `Approve all ${ready.length}`}
            </ActionButton>
          </div>
          <details className="fold border-t border-line">
            <summary className="!font-semibold text-ink-2 sm:!px-7">See {ready.length === 1 ? "it" : `the ${ready.length}`}</summary>
            <ul className="border-t border-line">
              {ready.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </ul>
          </details>
        </div>
      )}

      {done.length > 0 && (
        <details className="fold panel mt-10 overflow-hidden">
          <summary className="sm:!px-7">
            <span>
              Decided <span className="font-normal text-ink-3">{done.length}</span>
            </span>
          </summary>
          <ul className="border-t border-line">
            {done.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}

function Row({ row }: { row: InboxRow }) {
  const amount = fmtAmount(row.values.balance_due || row.values.total);
  const why = row.status === "needs_review" ? reason(row.sample.key, row.assessment.failed) : "";
  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        href={`/documents/${row.id}`}
        data-doc-key={row.sample.key}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-4 transition-colors hover:bg-mauve-soft sm:grid-cols-[minmax(0,1fr)_9.5rem_1.25rem] sm:px-7 sm:py-5"
      >
        <span className="min-w-0">
          <span className="block text-lg font-bold leading-snug tracking-[-0.01em] sm:text-[1.1875rem]">{row.title}</span>
          <span className="mt-0.5 block leading-snug text-ink-2">
            {KIND_LABEL[row.kind]} for {row.sample.client}.{" "}
            {why ? (
              <span className="font-medium text-amber">{why}</span>
            ) : row.status === "approved" ? (
              <span className="font-medium text-ok">Approved.</span>
            ) : row.status === "rejected" ? (
              <span className="font-medium text-brick">Held for the client.</span>
            ) : (
              <span className="font-medium text-ok">Ready to approve.</span>
            )}
          </span>
        </span>
        <span className="text-right text-lg font-bold tabular-nums">
          {amount && `$${amount}`}
          {amount && row.values.balance_due && <span className="block text-sm font-medium text-ink-3">balance due</span>}
        </span>
        <span aria-hidden className="hidden text-xl text-ink-3 transition-transform group-hover:translate-x-0.5 sm:block">
          ›
        </span>
      </Link>
    </li>
  );
}
