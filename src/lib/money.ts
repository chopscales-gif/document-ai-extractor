/** Money is compared in whole cents, so that 0.1 + 0.2 never decides whether an invoice adds up. */

/** "1,057.00" or "$432.12" as cents. Null when the text is empty or is not an amount. */
export function toCents(text: string | undefined): number | null {
  const cleaned = (text ?? "").replace(/[$,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, part = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}

/** Cents as "1,057.00". */
export function fmtCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

/** A stored amount ("1057.00") for display, or an empty string when there is none. */
export function fmtAmount(value: string | undefined): string {
  const cents = toCents(value);
  return cents === null ? "" : fmtCents(cents);
}

/** A stored date ("2026-11-02") as "Nov 2, 2026". Anything else is returned as it is. */
export function fmtDate(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return value ?? "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}
