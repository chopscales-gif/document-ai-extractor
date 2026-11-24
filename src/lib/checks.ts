import type { DocKind, Line } from "@/data/recordings";
import { fmtCents, toCents } from "./money";

/**
 * The checks run on every document. They are ordinary arithmetic and lookups,
 * not AI, and they run again whenever a value is corrected. They look at the
 * values as they stand now, so they catch a vendor's mistake and a misreading alike.
 */

export type Check = {
  key: string;
  /** What is being checked. */
  label: string;
  ok: boolean;
  /** What was found, in a sentence. */
  detail: string;
  /** A few words for the inbox when the check fails. */
  problem?: string;
  /** The one figure that says how far off it is, shown large on the review screen: "$10.00", "8 of 9". */
  figure?: string;
};

export type CheckContext = {
  /** Vendors this client already pays. */
  vendorsOnFile: string[];
  /** Invoices that arrived before this one and have not been rejected. */
  earlier: { vendor: string; number: string }[];
};

export type Values = Record<string, string>;

const pass = (key: string, label: string, detail: string): Check => ({ key, label, ok: true, detail });
const fail = (key: string, label: string, problem: string, detail: string, figure?: string): Check => ({ key, label, ok: false, detail, problem, ...(figure ? { figure } : {}) });
const dollars = (cents: number) => `$${fmtCents(cents)}`;

/** Names compared without case, punctuation or spacing, so a stray comma or capital letter does not make a new vendor. */
export const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");

export function runChecks(kind: DocKind, values: Values, lines: Line[], context: CheckContext): Check[] {
  return kind === "w9" ? formChecks(values) : billChecks(kind, values, lines, context);
}

function billChecks(kind: DocKind, values: Values, lines: Line[], context: CheckContext): Check[] {
  const checks: Check[] = [];
  const subtotal = toCents(values.subtotal);
  const tax = toCents(values.tax);
  const tip = toCents(values.tip);
  const total = toCents(values.total);

  const priced = lines.filter((line) => line.unitPrice);
  if (priced.length) {
    const label = "Quantity times price matches each line";
    const wrong = priced.filter((line) => Math.round(Number(line.qty) * (toCents(line.unitPrice) ?? NaN)) !== toCents(line.amount));
    checks.push(
      wrong.length
        ? fail("line_math", label, wrong.length === 1 ? "A line does not multiply out" : `${wrong.length} lines do not multiply out`, `${wrong.map((line) => line.description).join(", ")}: quantity times price does not give the amount.`, wrong.length === 1 ? "1 line" : `${wrong.length} lines`)
        : pass("line_math", label, priced.length === 1 ? "The one line multiplies out." : `All ${priced.length} lines multiply out.`),
    );
  }

  if (lines.length) {
    const label = "Lines add up to the subtotal";
    const sum = lines.reduce((running, line) => running + (toCents(line.amount) ?? 0), 0);
    if (subtotal === null) checks.push(fail("lines_sum", label, "No subtotal", "There is no subtotal to compare the lines with."));
    else if (sum !== subtotal)
      checks.push(
        fail(
          "lines_sum",
          label,
          `The lines add up to ${dollars(Math.abs(sum - subtotal))} ${sum < subtotal ? "less" : "more"} than the subtotal`,
          `The lines add up to ${fmtCents(sum)}. The subtotal says ${fmtCents(subtotal)}, a difference of ${fmtCents(Math.abs(sum - subtotal))}.`,
          dollars(Math.abs(sum - subtotal)),
        ),
      );
    else checks.push(pass("lines_sum", label, `${lines.length === 1 ? "The one line comes" : `The ${lines.length} lines add up`} to ${fmtCents(sum)}.`));
  }

  {
    const parts = tip === null ? "Subtotal plus tax" : "Subtotal plus tax and tip";
    const label = `${parts} equals the total`;
    if (subtotal === null || total === null) checks.push(fail("total_sum", label, "An amount is missing", "The subtotal or the total is missing."));
    else {
      const sum = subtotal + (tax ?? 0) + (tip ?? 0);
      checks.push(
        sum === total
          ? pass("total_sum", label, `${parts} comes to ${fmtCents(total)}.`)
          : fail("total_sum", label, `The total is ${dollars(Math.abs(sum - total))} off what its parts add up to`, `${parts} comes to ${fmtCents(sum)}. The total says ${fmtCents(total)}, a difference of ${fmtCents(Math.abs(sum - total))}.`, dollars(Math.abs(sum - total))),
      );
    }
  }

  const deposit = toCents(values.deposit);
  const balance = toCents(values.balance_due);
  if (deposit !== null || balance !== null) {
    const label = "Total less the deposit equals the balance due";
    if (total === null || deposit === null || balance === null) checks.push(fail("balance", label, "An amount is missing", "The total, the deposit or the balance is missing."));
    else
      checks.push(
        total - deposit === balance
          ? pass("balance", label, `${fmtCents(total)} less ${fmtCents(deposit)} leaves ${fmtCents(balance)}.`)
          : fail("balance", label, `The balance due is ${dollars(Math.abs(total - deposit - balance))} off`, `${fmtCents(total)} less ${fmtCents(deposit)} leaves ${fmtCents(total - deposit)}. The balance says ${fmtCents(balance)}.`, dollars(Math.abs(total - deposit - balance))),
      );
  }

  if (values.date && values.due_date) {
    const label = "Due date is not before the invoice date";
    checks.push(values.due_date >= values.date ? pass("dates", label, "The dates are in order.") : fail("dates", label, "Due before it was issued", "The due date is earlier than the invoice date.", "Due early"));
  }

  if (kind === "invoice") {
    const vendor = values.vendor ?? "";
    {
      const label = "Vendor is on file for this client";
      if (!vendor) checks.push(fail("vendor", label, "No vendor name", "There is no vendor name."));
      else if (context.vendorsOnFile.some((name) => sameName(name, vendor))) checks.push(pass("vendor", label, `${vendor} is on this client's vendor file.`));
      else checks.push(fail("vendor", label, "Not on this client's vendor file yet", `${vendor} is not on this client's vendor file. Add them to the file, or check that the bill is theirs.`, "New vendor"));
    }
    {
      const label = "Invoice number has not come in before";
      const number = values.number ?? "";
      if (!number) checks.push(fail("duplicate", label, "No invoice number", "There is no invoice number."));
      else if (context.earlier.some((other) => other.number === number && sameName(other.vendor, vendor)))
        checks.push(fail("duplicate", label, "Same invoice number as one already in. Paying both pays twice", `Invoice ${number} from ${vendor} has already come in. Paying both would pay this bill twice.`, `No. ${number}`));
      else checks.push(pass("duplicate", label, `No other invoice ${number} from this vendor.`));
    }
  }

  return checks;
}

function formChecks(values: Values): Check[] {
  const checks: Check[] = [];

  checks.push(values.name ? pass("name", "Name is filled in", values.name) : fail("name", "Name is filled in", "No name", "Line 1 is blank."));

  {
    const label = "Tax ID has nine digits";
    const digits = (values.tin ?? "").replace(/\D/g, "").length;
    if (digits === 9) checks.push(pass("tin", label, "Nine digits."));
    else if (digits === 0) checks.push(fail("tin", label, "No tax ID", "There is no tax ID on the form."));
    else {
      const off = Math.abs(9 - digits);
      const count = `${off === 1 ? "one digit" : `${off} digits`} ${digits < 9 ? "short" : "too many"}`;
      checks.push(fail("tin", label, `Tax ID is ${count}`, `The tax ID has ${digits} digits, ${count}. Ask for a corrected form.`, `${digits} of 9`));
    }
  }

  checks.push(
    (values.signed ?? "").toLowerCase() === "yes"
      ? pass("signed", "Form is signed", "There is a signature.")
      : fail("signed", "Form is signed", "Not signed", "The signature line is blank. An unsigned form does not certify the tax ID.", "Unsigned"),
  );
  checks.push(values.signature_date ? pass("dated", "Form is dated", "There is a date beside the signature.") : fail("dated", "Form is dated", "Not dated", "There is no date beside the signature.", "No date"));

  return checks;
}
