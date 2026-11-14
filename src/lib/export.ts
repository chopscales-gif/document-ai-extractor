import type { DocKind } from "@/data/recordings";
import type { Values } from "./checks";

/**
 * What leaves the review step: a spreadsheet row per approved bill or receipt,
 * and the request an accounting system would be sent. The demo shows the
 * requests and sends nothing.
 */

export type Approved = { kind: DocKind; client: string; values: Values; note: string };

/** A tax ID with all but the last four digits hidden, for anywhere it is listed. */
export function maskTaxId(taxId: string): string {
  let digitsLeft = taxId.replace(/\D/g, "").length;
  return taxId.replace(/\d/g, (digit) => (digitsLeft-- > 4 ? "•" : digit));
}

const COLUMNS: [heading: string, value: (doc: Approved) => string][] = [
  ["Client", (doc) => doc.client],
  ["Type", (doc) => (doc.kind === "invoice" ? "Bill" : "Expense")],
  ["Vendor", (doc) => doc.values.vendor ?? ""],
  ["Number", (doc) => doc.values.number ?? ""],
  ["Date", (doc) => doc.values.date ?? ""],
  ["Due date", (doc) => doc.values.due_date ?? ""],
  ["Category", (doc) => doc.values.category ?? ""],
  ["Subtotal", (doc) => doc.values.subtotal ?? ""],
  ["Tax", (doc) => doc.values.tax ?? ""],
  ["Tip", (doc) => doc.values.tip ?? ""],
  ["Total", (doc) => doc.values.total ?? ""],
  ["Balance due", (doc) => doc.values.balance_due ?? ""],
  ["Approval note", (doc) => doc.note],
];

/** Quoted where needed, and never starting with a character a spreadsheet would run as a formula. */
function cell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Approved bills and receipts as a spreadsheet. W-9s are vendor records, not transactions, so they are left out. */
export function toCsv(docs: Approved[]): string {
  const rows = docs.filter((doc) => doc.kind !== "w9").map((doc) => COLUMNS.map(([, value]) => cell(value(doc))).join(","));
  return [COLUMNS.map(([heading]) => heading).join(","), ...rows].join("\r\n") + "\r\n";
}

export type AccountingRequest = { send: string; body: Record<string, unknown> };

/**
 * The request that would create this bill (or card expense) in QuickBooks
 * Online. Vendors and accounts are shown by name; a connected build looks up
 * the ids of both in the client's own QuickBooks company first.
 */
export function toAccountingRequest(doc: Approved): AccountingRequest | null {
  if (doc.kind === "w9") return null;
  const { values } = doc;
  const line = {
    DetailType: "AccountBasedExpenseLineDetail",
    Amount: Number(values.total || 0),
    Description: [values.memo, doc.note].filter(Boolean).join(". ") || undefined,
    AccountBasedExpenseLineDetail: { AccountRef: { name: values.category ?? "" } },
  };
  if (doc.kind === "invoice") {
    return {
      send: "POST /v3/company/{company id}/bill",
      body: { VendorRef: { name: values.vendor ?? "" }, DocNumber: values.number || undefined, TxnDate: values.date || undefined, DueDate: values.due_date || undefined, Line: [line] },
    };
  }
  return {
    send: "POST /v3/company/{company id}/purchase",
    body: { PaymentType: "CreditCard", AccountRef: { name: values.paid_with ?? "" }, EntityRef: { name: values.vendor ?? "", type: "Vendor" }, DocNumber: values.number || undefined, TxnDate: values.date || undefined, Line: [line] },
  };
}
