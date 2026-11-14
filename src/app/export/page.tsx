import type { Metadata } from "next";
import Link from "next/link";
import { maskTaxId, toAccountingRequest } from "@/lib/export";
import { fmtAmount, fmtDate } from "@/lib/money";
import { inbox } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Export" };

export default async function ExportPage() {
  const rows = await inbox(await getCtx());
  const approved = rows.filter((row) => row.status === "approved");
  const bills = approved.filter((row) => row.kind !== "w9");
  const forms = approved.filter((row) => row.kind === "w9");
  const waiting = rows.filter((row) => row.status === "needs_review").length;

  return (
    <main className="mx-auto grid w-full max-w-[90rem] flex-1 content-start items-start gap-x-10 gap-y-7 px-4 py-8 sm:px-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:py-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-8">
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-[2.5rem] text-paper xl:text-5xl">Export</h1>
        <p className="mt-4 max-w-[60ch] leading-normal text-desk-text sm:text-[1.0625rem] sm:leading-relaxed">
          Only approved documents get this far. {waiting > 0 && `${waiting}${approved.length ? " more" : ""} ${waiting === 1 ? "is" : "are"} still waiting in the inbox.`}
        </p>
        {bills.length > 0 && (
          <a href="/export/bills.csv" download className="btn mt-6 bg-paper text-ink hover:bg-white">
            Download the spreadsheet (CSV)
          </a>
        )}
      </div>

      <div className="grid gap-6">
        {approved.length === 0 && (
          <div className="sheet px-5 py-6 sm:px-6">
            <p className="font-display text-xl font-bold">Nothing has been approved yet</p>
            <p className="mt-1 text-muted">Approve a document in the inbox and it appears here, as a spreadsheet row and as the request that would go to the accounting system.</p>
            <Link href="/" className="btn btn-primary mt-4">
              Go to the inbox
            </Link>
          </div>
        )}

        {bills.length > 0 && (
          <section className="sheet">
            <div className="border-b-2 border-ink px-4 pb-3 pt-5 sm:px-6">
              <h2 className="font-display text-2xl font-bold tracking-tight">Bills and expenses</h2>
              <p className="mt-0.5 leading-snug text-muted">One row each, with any corrections you made.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-rule-strong text-left text-muted">
                    {["Client", "Vendor", "Number", "Date", "Category"].map((heading) => (
                      <th key={heading} className="px-3 py-2 font-medium first:pl-4 sm:first:pl-6">
                        {heading}
                      </th>
                    ))}
                    <th className="money-col px-3 py-2 text-right font-medium sm:pr-6">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((row) => (
                    <tr key={row.id} className="border-b border-rule last:border-0">
                      <td className="py-2 pl-4 pr-3 sm:pl-6">{row.sample.client}</td>
                      <td className="px-3">
                        <Link href={`/documents/${row.id}`} className="inline-flex min-h-11 items-center font-semibold underline decoration-rule-strong underline-offset-2 hover:decoration-ink sm:min-h-9">
                          {row.values.vendor}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.values.number}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.values.date)}</td>
                      <td className="px-3 py-2">{row.values.category}</td>
                      <td className="money-col px-3 py-2 text-right font-semibold sm:pr-6">
                        {fmtAmount(row.values.total)}
                        {row.values.balance_due && <span className="block whitespace-nowrap font-normal text-muted">{fmtAmount(row.values.balance_due)} still due</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>
        )}

        {bills.length > 0 && (
          <section className="sheet">
            <div className="border-b-2 border-ink px-4 pb-3 pt-5 sm:px-6">
              <h2 className="font-display text-2xl font-bold tracking-tight">What would be sent to QuickBooks</h2>
              <p className="mt-0.5 max-w-[72ch] leading-snug text-muted">
                This demo is not connected to an accounting system, so nothing is sent. These are the requests a connected build would make, one per document. Vendors and accounts are shown by name here; a connected build uses the ids from the client&apos;s own books.
              </p>
            </div>
            <div>
              {bills.map((row) => {
                const request = toAccountingRequest({ kind: row.kind, client: row.sample.client, values: row.values, note: row.note })!;
                return (
                  <details key={row.id} className="border-b border-rule last:border-b-0">
                    <summary className="cursor-pointer px-4 py-2.5 font-semibold hover:bg-pencil-tint/60 sm:px-6">
                      {row.values.vendor} <span className="font-normal text-muted">{row.kind === "invoice" ? "as a bill" : "as a card expense"}</span>
                    </summary>
                    <pre className="overflow-x-auto border-t border-rule bg-white px-4 py-3 text-[0.8125rem] leading-relaxed sm:px-6">
                      {request.send}
                      {"\n\n"}
                      {JSON.stringify(request.body, null, 2)}
                    </pre>
                  </details>
                );
              })}
            </div>
          </section>
        )}

        {forms.length > 0 && (
          <section className="sheet">
            <div className="border-b-2 border-ink px-4 pb-3 pt-5 sm:px-6">
              <h2 className="font-display text-2xl font-bold tracking-tight">Vendor tax records</h2>
              <p className="mt-0.5 max-w-[72ch] leading-snug text-muted">From approved W-9s, for year-end 1099s. Tax IDs are hidden except the last four digits anywhere they are listed.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-rule-strong text-left text-muted">
                    {["Client", "Vendor", "Classification", "Tax ID", "Signed"].map((heading) => (
                      <th key={heading} className="px-3 py-2 font-medium first:pl-4 sm:first:pl-6">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forms.map((row) => (
                    <tr key={row.id} className="border-b border-rule last:border-0">
                      <td className="py-2 pl-4 pr-3 sm:pl-6">{row.sample.client}</td>
                      <td className="px-3">
                        <Link href={`/documents/${row.id}`} className="inline-flex min-h-11 items-center font-semibold underline decoration-rule-strong underline-offset-2 hover:decoration-ink sm:min-h-9">
                          {row.values.business_name || row.values.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.values.classification}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.values.tin_type} {maskTaxId(row.values.tin ?? "")}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.values.signature_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
