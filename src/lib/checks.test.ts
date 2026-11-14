import { describe, expect, it } from "vitest";
import type { Line } from "@/data/recordings";
import { runChecks, type CheckContext } from "./checks";
import { maskTaxId, toAccountingRequest, toCsv } from "./export";
import { fmtCents, toCents } from "./money";

const context: CheckContext = { vendorsOnFile: ["Bellwether Linen Service"], earlier: [] };
const lines: Line[] = [
  { description: "Bib aprons", qty: "40", unitPrice: "0.85", amount: "34.00" },
  { description: "Labor, hours", qty: "2.5", unitPrice: "110.00", amount: "275.00" },
];
const invoice = { vendor: "Bellwether Linen Service", number: "BL-1", date: "2026-11-02", due_date: "2026-12-02", subtotal: "309.00", tax: "22.40", total: "331.40" };
const failed = (values: Record<string, string>, over: Partial<CheckContext> = {}, kind: "invoice" | "receipt" | "w9" = "invoice") =>
  runChecks(kind, values, kind === "w9" ? [] : lines, { ...context, ...over }).filter((check) => !check.ok).map((check) => check.key);

describe("money", () => {
  it("reads amounts as cents and refuses anything else", () => {
    expect(toCents("$1,057.00")).toBe(105700);
    expect(toCents("3.5")).toBe(350);
    expect(toCents("")).toBeNull();
    expect(toCents("12.345")).toBeNull();
    expect(toCents("abc")).toBeNull();
    expect(fmtCents(951874)).toBe("9,518.74");
  });
});

describe("checks on a bill", () => {
  it("passes an invoice that adds up, from a vendor on file", () => {
    expect(failed(invoice)).toEqual([]);
  });

  it("catches a subtotal that is not the sum of the lines, and a total that is not subtotal plus tax", () => {
    expect(failed({ ...invoice, subtotal: "319.00" })).toEqual(["lines_sum", "total_sum"]);
    expect(failed({ ...invoice, total: "331.04" })).toEqual(["total_sum"]);
  });

  it("is not thrown by amounts that floating point gets wrong", () => {
    const tenths: Line[] = [
      { description: "a", qty: "3", unitPrice: "0.10", amount: "0.30" },
      { description: "b", qty: "1", unitPrice: "0.20", amount: "0.20" },
    ];
    expect(runChecks("receipt", { subtotal: "0.50", tax: "0.04", total: "0.54" }, tenths, context).every((check) => check.ok)).toBe(true);
  });

  it("counts a tip towards the total", () => {
    expect(failed({ subtotal: "309.00", tax: "5.00", tip: "12.00", total: "326.00" }, {}, "receipt")).toEqual([]);
    expect(failed({ subtotal: "309.00", tax: "5.00", tip: "12.00", total: "314.00" }, {}, "receipt")).toEqual(["total_sum"]);
  });

  it("checks a deposit against the balance", () => {
    expect(failed({ ...invoice, deposit: "100.00", balance_due: "231.40" })).toEqual([]);
    expect(failed({ ...invoice, deposit: "100.00", balance_due: "331.40" })).toEqual(["balance"]);
  });

  it("flags a vendor the client has not paid, ignoring punctuation and case", () => {
    expect(failed({ ...invoice, vendor: "BELLWETHER LINEN SERVICE." })).toEqual([]);
    expect(failed({ ...invoice, vendor: "Bellweather Linen" })).toEqual(["vendor"]);
  });

  it("flags an invoice number that already came in from the same vendor only", () => {
    expect(failed(invoice, { earlier: [{ vendor: "Bellwether Linen Service", number: "BL-1" }] })).toEqual(["duplicate"]);
    expect(failed(invoice, { earlier: [{ vendor: "Someone Else", number: "BL-1" }] })).toEqual([]);
  });

  it("words the vendor and duplicate checks so they stay true after a vendor is added or the first copy is approved", () => {
    const detail = (key: string, over: Partial<CheckContext> = {}) => runChecks("invoice", invoice, lines, { ...context, ...over }).find((check) => check.key === key)?.detail;
    expect(detail("vendor")).toBe("Bellwether Linen Service is on this client's vendor file.");
    expect(detail("vendor", { vendorsOnFile: [] })).toBe("Bellwether Linen Service is not on this client's vendor file. Add them to the file, or check that the bill is theirs.");
    expect(detail("duplicate", { earlier: [{ vendor: "Bellwether Linen Service", number: "BL-1" }] })).toBe("Invoice BL-1 from Bellwether Linen Service has already come in. Paying both would pay this bill twice.");
  });

  it("flags a due date before the invoice date", () => {
    expect(failed({ ...invoice, due_date: "2026-10-02" })).toEqual(["dates"]);
  });

  it("does not ask a receipt for a vendor on file or an invoice number", () => {
    expect(failed({ subtotal: "309.00", tax: "0.00", total: "309.00" }, {}, "receipt")).toEqual([]);
  });
});

describe("checks on a W-9", () => {
  const form = { name: "Lucinda Farrow", tin: "000-48-2175", signed: "Yes", signature_date: "2026-11-04" };
  it("passes a complete form", () => {
    expect(failed(form, {}, "w9")).toEqual([]);
  });
  it("says how many digits a tax ID is off by", () => {
    const [check] = runChecks("w9", { ...form, tin: "000-48-217" }, [], context).filter((c) => !c.ok);
    expect(check.problem).toBe("Tax ID is one digit short");
  });
  it("flags a blank signature and date", () => {
    expect(failed({ ...form, signed: "No", signature_date: "" }, {}, "w9")).toEqual(["signed", "dated"]);
  });
});

describe("export", () => {
  const bill = { kind: "invoice" as const, client: "Copper Kettle Cafe", values: { ...invoice, category: "Linen and laundry" }, note: 'Called "Bellwether", fine' };

  it("writes one row per bill, quoting where needed and leaving W-9s out", () => {
    const csv = toCsv([bill, { kind: "w9", client: "x", values: { name: "y" }, note: "" }]).split("\r\n");
    expect(csv).toHaveLength(3);
    expect(csv[0]).toBe("Client,Type,Vendor,Number,Date,Due date,Category,Subtotal,Tax,Tip,Total,Balance due,Approval note");
    expect(csv[1]).toBe('Copper Kettle Cafe,Bill,Bellwether Linen Service,BL-1,2026-11-02,2026-12-02,Linen and laundry,309.00,22.40,,331.40,,"Called ""Bellwether"", fine"');
  });

  it("does not let a value be run as a spreadsheet formula", () => {
    expect(toCsv([{ ...bill, values: { ...bill.values, vendor: "=HYPERLINK(1)" }, note: "" }])).toContain(",'=HYPERLINK(1),");
  });

  it("builds a bill for an invoice, a card expense for a receipt, and nothing for a W-9", () => {
    expect(toAccountingRequest(bill)).toMatchObject({ send: "POST /v3/company/{company id}/bill", body: { VendorRef: { name: "Bellwether Linen Service" }, DocNumber: "BL-1", Line: [{ Amount: 331.4 }] } });
    expect(toAccountingRequest({ ...bill, kind: "receipt" })?.send).toContain("/purchase");
    expect(toAccountingRequest({ ...bill, kind: "w9" })).toBeNull();
  });

  it("hides all but the last four digits of a tax ID", () => {
    expect(maskTaxId("00-4471209")).toBe("••-•••1209");
    expect(maskTaxId("000-48-217")).toBe("•••-•8-217");
    expect(maskTaxId("")).toBe("");
  });
});
