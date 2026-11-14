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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">Export</h1>
      <p className="mt-3 max-w-[68ch] text-lg leading-relaxed text-muted">
        Only approved documents get this far. {waiting > 0 && `${waiting} more ${waiting === 1 ? "is" : "are"} still waiting in the inbox.`}
      </p>

      {approved.length === 0 && (
        <div className="panel mt-8 px-5 py-6">
          <p className="font-semibold">Nothing has been approved yet</p>
          <p className="mt-1 text-muted">Approve a document in the inbox and it appears here, as a spreadsheet row and as the request that would go to the accounting system.</p>
          <Link href="/" className="btn btn-primary mt-4">
            Go to the inbox
          </Link>
        </div>
      )}

      {bills.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Bills and expenses</h2>
              <p className="mt-0.5 leading-snug text-muted">One row each, with any corrections you made.</p>
            </div>
            <a href="/export/bills.csv" download className="btn btn-primary">
              Download the spreadsheet (CSV)
            </a>
          </div>
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm tabular-nums">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  {["Client", "Vendor", "Number", "Date", "Category"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((row) => (
                  <tr key={row.id} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2">{row.sample.client}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/documents/${row.id}`} className="underline-offset-2 hover:underline">
                        {row.values.vendor}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.values.number}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.values.date)}</td>
                    <td className="px-3 py-2">{row.values.category}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtAmount(row.values.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 font-display text-xl font-semibold">What would be sent to QuickBooks</h3>
          <p className="mt-1 max-w-[68ch] leading-snug text-muted">
            This demo is not connected to an accounting system, so nothing is sent. These are the requests a connected build would make, one per document. Vendors and accounts are shown by name here; a connected build uses the ids from the client&apos;s own books.
          </p>
          <div className="mt-3 grid gap-2">
            {bills.map((row) => {
              const request = toAccountingRequest({ kind: row.kind, client: row.sample.client, values: row.values, note: row.note })!;
              return (
                <details key={row.id} className="panel">
                  <summary className="cursor-pointer px-4 py-2.5 font-medium">
                    {row.values.vendor} <span className="font-normal text-muted">{row.kind === "invoice" ? "as a bill" : "as a card expense"}</span>
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
        </section>
      )}

      {forms.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Vendor tax records</h2>
          <p className="mt-0.5 max-w-[68ch] leading-snug text-muted">From approved W-9s, for year-end 1099s. Tax IDs are hidden except the last four digits anywhere they are listed.</p>
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm tabular-nums">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  {["Client", "Vendor", "Classification", "Tax ID", "Signed"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forms.map((row) => (
                  <tr key={row.id} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2">{row.sample.client}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/documents/${row.id}`} className="underline-offset-2 hover:underline">
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
    </main>
  );
}
