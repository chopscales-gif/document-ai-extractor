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
  const guideLink = "font-semibold underline decoration-ink/40 underline-offset-2 hover:decoration-ink";

  return (
    <main className="mx-auto grid w-full max-w-[90rem] flex-1 content-start items-start gap-x-10 gap-y-7 px-4 py-8 sm:px-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:py-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
      {/* What is on the desk this morning, and where to start. It stays put while the ledger scrolls. */}
      <div className="lg:sticky lg:top-8">
        <h1 className="font-display text-4xl font-medium leading-[1.05] sm:text-[2.5rem] tracking-tight text-paper xl:text-5xl">
          {waiting.length ? `${plural(waiting.length, "document is", "documents are")} waiting` : "The inbox is clear"}
        </h1>
        <p className="mt-4 max-w-[60ch] leading-normal text-desk-text sm:text-[1.0625rem] sm:leading-relaxed">
          {waiting.length
            ? "Each one has been read by AI and then checked: do the lines add up, has this invoice number come in before, is the form signed. The ones that pass can be approved together. The rest are held for a person, with the reason."
            : "Everything has been approved or rejected. The approved ones are on the Export page. Reset demo in the top bar puts all twelve documents back."}
        </p>

        {waiting.length > 0 && (
          <aside aria-label="Demo guide" className="slip mt-7 max-w-[34rem] px-4 py-3.5 shadow-[0_6px_18px_rgb(20_4_8/0.35)] lg:-rotate-[0.6deg]">
            <p className="font-display text-lg font-bold">Three things to try</p>
            <ol className="mt-1.5 grid list-decimal gap-2 pl-5 leading-snug">
              <li>
                Open the <Link className={guideLink} href={`/documents/${find("plumbing-invoice").id}`}>plumber&apos;s invoice</Link> and choose a value. It lights up where it was read on the page. One of the checks caught a mistake the plumber made.
              </li>
              <li>
                Open the <Link className={guideLink} href={`/documents/${find("w9-farrow").id}`}>handwritten W-9</Link>, photographed at an angle, and see what was flagged.
              </li>
              <li>
                Come back and approve the clean ones together, then open <Link className={guideLink} href="/export">Export</Link> to see what would go to the books.
              </li>
            </ol>
          </aside>
        )}
      </div>

      {/* One ledger page: held, ready, done. */}
      <div className="sheet">
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
      </div>
    </main>
  );
}

function Section({ title, count, blurb, action, children }: { title: string; count: number; blurb: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t-[6px] border-desk first:border-t-0">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink px-4 pb-3 pt-5 sm:px-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {title} <span className="ml-1 font-sans text-base font-normal tabular-nums text-muted">{count}</span>
          </h2>
          <p className="mt-0.5 leading-snug text-muted">{blurb}</p>
        </div>
        {action}
      </div>
      <ul>{children}</ul>
    </section>
  );
}

function Row({ row }: { row: InboxRow }) {
  const { assessment, values } = row;
  const amount = fmtAmount(values.balance_due || values.total);
  const reasons = row.status !== "needs_review" ? [] : [...assessment.failed.map((check) => check.problem ?? check.label), ...(assessment.notes.length ? [assessment.notes.length === 1 ? "One note from the AI" : `${assessment.notes.length} notes from the AI`] : [])];

  return (
    <li className="border-b border-rule last:border-b-0">
      <Link href={`/documents/${row.id}`} className="group grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 px-4 py-3 hover:bg-pencil-tint/60 sm:grid-cols-[3rem_minmax(0,1fr)_9.5rem_11.75rem] sm:items-stretch sm:py-0 sm:pl-6 sm:pr-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- small preview of a fixed sample scan */}
        <img src={pageImage(row.sample.key, 1)} alt="" loading="lazy" className="row-span-2 h-16 w-12 self-center border border-rule-strong bg-white object-cover object-top shadow-[1px_2px_0_rgb(27_34_51/0.12)] sm:row-span-1 sm:my-3" />
        <div className="min-w-0 self-center sm:py-3">
          <p className="text-[1.0625rem] font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{row.title}</p>
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
        {/* On a wide screen the amounts line up in a ruled money column, as they would in a ledger. */}
        <div className="col-start-2 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
          <div className={`sm:money-col sm:flex sm:flex-col sm:items-end sm:justify-center sm:px-3 sm:py-3 ${amount ? "" : "max-sm:hidden"}`}>
            {amount && (
              <p className="text-lg font-semibold tabular-nums">
                ${amount}
                {values.balance_due && <span className="ml-1.5 text-sm font-normal text-muted sm:ml-0 sm:block sm:text-right">balance due on ${fmtAmount(values.total)}</span>}
              </p>
            )}
          </div>
          <div className="sm:flex sm:items-center sm:border-l sm:border-rule sm:px-3 sm:py-3">
            <StatusChip status={row.status} clean={assessment.clean} />
          </div>
        </div>
      </Link>
    </li>
  );
}
