import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { StatusChip } from "@/components/ui";
import { fmtAmount } from "@/lib/money";
import { KIND_LABEL, pageImage } from "@/lib/samples";
import { approveCleanAction } from "@/server/actions";
import { inbox, type InboxRow } from "@/server/queries";
import { getCtx } from "@/server/session";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function InboxPage() {
  const rows = await inbox(await getCtx());
  const waiting = rows.filter((row) => row.status === "needs_review");
  const look = waiting.filter((row) => !row.assessment.clean);
  const ready = waiting.filter((row) => row.assessment.clean);
  const done = rows.filter((row) => row.status !== "needs_review");
  const find = (key: string) => rows.find((row) => row.sample.key === key)!;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
        {waiting.length ? `${plural(waiting.length, "document is", "documents are")} waiting` : "The inbox is clear"}
      </h1>
      <p className="mt-3 max-w-[68ch] text-lg leading-relaxed text-muted">
        {waiting.length
          ? "Each one has been read by AI and then checked: do the lines add up, has this invoice number come in before, is the form signed. The ones that pass can be approved together. The rest are held for a person, with the reason."
          : "Everything has been approved or rejected. The approved ones are on the Export page."}
      </p>

      <aside aria-label="Demo guide" className="mt-6 rounded-lg border border-dashed border-ink/40 px-4 py-3">
        <p className="font-semibold">Three things to try</p>
        <ol className="mt-1.5 grid list-decimal gap-1.5 pl-5 leading-snug">
          <li>
            Open the <Link className="font-semibold underline underline-offset-2" href={`/documents/${find("plumbing-invoice").id}`}>plumber&apos;s invoice</Link> and choose a value. It lights up where it was read on the page. The check below it caught a mistake the plumber made.
          </li>
          <li>
            Open the <Link className="font-semibold underline underline-offset-2" href={`/documents/${find("w9-farrow").id}`}>handwritten W-9</Link>, photographed at an angle, and see what was flagged.
          </li>
          <li>
            Come back and approve the clean ones together, then open <Link className="font-semibold underline underline-offset-2" href="/export">Export</Link> to see what would go to the books.
          </li>
        </ol>
      </aside>

      {look.length > 0 && (
        <Section title="Needs a look" count={look.length} blurb="A check failed, or the AI flagged something it was not sure how to treat.">
          {look.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </Section>
      )}

      {ready.length > 0 && (
        <Section
          title="Ready to approve"
          count={ready.length}
          blurb="Every check passed and nothing was flagged. Open any of them to see for yourself."
          action={
            <ActionButton action={approveCleanAction} pendingLabel="Approving">
              Approve {ready.length === 1 ? "it" : `all ${ready.length}`}
            </ActionButton>
          }
        >
          {ready.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Done" count={done.length} blurb="Approved documents are on the Export page. Any of these can be reopened.">
          {done.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({ title, count, blurb, action, children }: { title: string; count: number; blurb: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {title} <span className="font-sans text-base font-normal text-muted">{count}</span>
          </h2>
          <p className="mt-0.5 leading-snug text-muted">{blurb}</p>
        </div>
        {action}
      </div>
      <ul className="panel mt-3 divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({ row }: { row: InboxRow }) {
  const { assessment, values } = row;
  const amount = fmtAmount(values.balance_due || values.total);
  const reasons = row.status !== "needs_review" ? [] : [...assessment.failed.map((check) => check.problem ?? check.label), ...(assessment.notes.length ? [assessment.notes.length === 1 ? "One note from the AI" : `${assessment.notes.length} notes from the AI`] : [])];

  return (
    <li>
      <Link href={`/documents/${row.id}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 px-4 py-3 hover:bg-accent-tint/40 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- small preview of a fixed sample scan */}
        <img src={pageImage(row.sample.key, 1)} alt="" loading="lazy" className="row-span-2 h-16 w-12 rounded-sm border border-line object-cover object-top sm:row-span-1" />
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{row.title}</p>
          <p className="text-sm leading-snug text-muted">
            {KIND_LABEL[row.kind]} for {row.sample.client}. {row.sample.source}, {row.sample.received}.
          </p>
          {reasons.length > 0 && (
            <p className="mt-1 text-sm font-medium leading-relaxed">
              {reasons.map((reason, index) => (
                <span key={reason}>
                  {index > 0 && " "}
                  <span className="mark">{reason}</span>
                </span>
              ))}
            </p>
          )}
          {row.status === "rejected" && row.note && <p className="mt-1 text-sm leading-snug text-flag">{row.note}</p>}
        </div>
        <div className="col-start-2 mt-2 flex items-center gap-3 sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
          {amount && <p className="text-lg font-semibold tabular-nums">${amount}</p>}
          <StatusChip status={row.status} clean={assessment.clean} />
        </div>
      </Link>
    </li>
  );
}
