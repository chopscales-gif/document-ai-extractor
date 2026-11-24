import type { Metadata } from "next";
import Link from "next/link";
import { maskTaxId, toAccountingRequest } from "@/lib/export";
import { fmtAmount, fmtDate } from "@/lib/money";
import { inbox } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Export" };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What goes to the books: approved documents only, as one list and one spreadsheet. The machinery behind it is folded. */
export default async function ExportPage() {
  const rows = await inbox(await getCtx());
  const approved = rows.filter((row) => row.status === "approved");
  const bills = approved.filter((row) => row.kind !== "w9");
  const forms = approved.filter((row) => row.kind === "w9");
  const waiting = rows.filter((row) => row.status === "needs_review").length;
  const parts = [
    bills.filter((row) => row.kind === "invoice").length && count(bills.filter((row) => row.kind === "invoice").length, "bill", "bills"),
    bills.filter((row) => row.kind === "receipt").length && count(bills.filter((row) => row.kind === "receipt").length, "receipt", "receipts"),
    forms.length && count(forms.length, "W-9", "W-9s"),
  ].filter(Boolean) as string[];
  const said = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];

  return (
    <main className="mx-auto w-full max-w-[76rem] flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="text-ink-3">Approved documents only</p>
      <h1 className="mt-2 max-w-[24ch] text-[clamp(2.125rem,4.4vw,3.375rem)] font-extrabold leading-[1.07] tracking-[-0.03em]">
        {approved.length ? `${said} ${approved.length === 1 ? "is" : "are"} ready for the books.` : "Nothing is approved yet."}{" "}
        {waiting > 0 && <span className="text-ink-3">{waiting} still in the inbox.</span>}
      </h1>

      {approved.length === 0 ? (
        <div className="mt-9">
          <p className="max-w-[40em] text-lg text-ink-2">Approve a document in the inbox and it appears here, as a row in the spreadsheet and as the request that would go to the accounting system.</p>
          <Link href="/inbox" className="btn btn-primary mt-6">
            Go to the inbox
          </Link>
        </div>
      ) : (
        <>
          {bills.length > 0 && (
            <ul className="panel mt-9 overflow-hidden">
              {bills.map((row) => (
                <li key={row.id} className="border-t border-line first:border-t-0">
                  <Link href={`/documents/${row.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 px-5 py-4 transition-colors hover:bg-mauve-soft sm:px-7 sm:py-5">
                    <span className="min-w-0">
                      <span className="block text-lg font-bold leading-snug tracking-[-0.01em]">{row.values.vendor}</span>
                      <span className="mt-0.5 block leading-snug text-ink-2">
                        {row.sample.client}. {row.values.category}
                        {row.kind === "receipt" ? ", card expense" : ""}. {fmtDate(row.values.date)}.
                      </span>
                    </span>
                    <span className="text-right text-lg font-bold tabular-nums">
                      ${fmtAmount(row.values.total)}
                      {row.values.balance_due && <span className="block text-sm font-medium text-ink-3">${fmtAmount(row.values.balance_due)} still due</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            {bills.length > 0 && (
              <a href="/export/bills.csv" download className="btn btn-primary max-sm:w-full">
                Download the spreadsheet (CSV)
              </a>
            )}
            <span className="text-[0.9375rem] text-ink-3">Nothing is sent to an accounting system from this demo.</span>
          </div>

          <div className="mt-8 grid gap-3">
            {bills.length > 0 && (
              <details className="fold panel">
                <summary>What a connected build would send to QuickBooks</summary>
                <div className="px-5 pb-5 sm:px-6">
                  <p className="max-w-[60em] text-[0.9375rem] text-ink-2">One request per document. Vendors and accounts are shown by name here; a connected build uses the ids from the client&apos;s own books.</p>
                  <div className="mt-3 grid gap-3">
                    {bills.map((row) => {
                      const request = toAccountingRequest({ kind: row.kind, client: row.sample.client, values: row.values, note: row.note })!;
                      return (
                        <details key={row.id} className="rounded-2xl bg-paper">
                          <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2.5 font-semibold">
                            {row.values.vendor} <span className="ml-1.5 font-normal text-ink-3">{row.kind === "invoice" ? "as a bill" : "as a card expense"}</span>
                          </summary>
                          <pre className="overflow-x-auto border-t border-line px-4 py-3 text-[0.8125rem] leading-relaxed">
                            {request.send}
                            {"\n\n"}
                            {JSON.stringify(request.body, null, 2)}
                          </pre>
                        </details>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}

            {forms.length > 0 && (
              <details className="fold panel">
                <summary>Vendor tax records for year-end 1099s</summary>
                <div className="px-5 pb-5 sm:px-6">
                  <p className="text-[0.9375rem] text-ink-2">From approved W-9s. Tax IDs are hidden except the last four digits.</p>
                  <ul className="mt-3 grid gap-2">
                    {forms.map((row) => (
                      <li key={row.id} className="leading-snug">
                        <Link href={`/documents/${row.id}`} className="link">
                          {row.values.business_name || row.values.name}
                        </Link>
                        <span className="text-ink-2">
                          {" "}
                          for {row.sample.client}. {row.values.classification}, {row.values.tin_type} {maskTaxId(row.values.tin ?? "")}, signed {fmtDate(row.values.signature_date)}.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </main>
  );
}
