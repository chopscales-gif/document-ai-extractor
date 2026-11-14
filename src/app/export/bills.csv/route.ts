import { toCsv } from "@/lib/export";
import { inbox } from "@/server/queries";
import { getCtx } from "@/server/session";
import { WorkflowError } from "@/server/workflow";

/** The visitor's approved bills and receipts as a spreadsheet. */
export async function GET() {
  try {
    const rows = await inbox(await getCtx());
    const approved = rows.filter((row) => row.status === "approved").map((row) => ({ kind: row.kind, client: row.sample.client, values: row.values, note: row.note }));
    return new Response(toCsv(approved), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="approved-bills-demo.csv"', "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof WorkflowError) return new Response(error.message, { status: 400 });
    throw error;
  }
}
