import { RECORDINGS } from "@/data/recordings";
import type { Check } from "./checks";

/**
 * What a person is told first about a document: one thing to look at, said in
 * one sentence with one figure, and where that finding came from. Everything
 * else about the document is a click away.
 */

/** How each check found what it found. None of them is the AI. */
const FOUND_BY: Record<string, string> = {
  line_math: "Found by arithmetic, not by the AI.",
  lines_sum: "Found by arithmetic, not by the AI.",
  total_sum: "Found by arithmetic, not by the AI.",
  balance: "Found by arithmetic, not by the AI.",
  dates: "Found by comparing the two dates, not by the AI.",
  vendor: "Found by looking in the client's vendor file, not by the AI.",
  duplicate: "Found by comparing with the invoices already in, not by the AI.",
  name: "Found by a plain rule on the form, not by the AI.",
  tin: "Found by counting the digits, not by the AI.",
  signed: "Found by a plain rule on the form, not by the AI.",
  dated: "Found by a plain rule on the form, not by the AI.",
};

/** The values a failed check is about, so the screen can point at them first. */
export const CHECK_FIELDS: Record<string, string[]> = {
  line_math: ["lines"],
  lines_sum: ["subtotal", "lines"],
  total_sum: ["total"],
  balance: ["balance_due"],
  dates: ["due_date"],
  vendor: ["vendor"],
  duplicate: ["number"],
  name: ["name"],
  tin: ["tin"],
  signed: ["signed"],
  dated: ["signature_date"],
};

export const foundBy = (check: Check) => FOUND_BY[check.key] ?? "Found by a plain rule, not by the AI.";

/** The AI's own notes on a document: the one about the page first, then the longest about a single value. */
export function aiNotes(key: string): { text: string; field?: string }[] {
  const recording = RECORDINGS[key];
  const onFields = recording.fields.filter((field) => field.note).map((field) => ({ text: field.note!, field: field.key }));
  return [...recording.notes.map((text) => ({ text })), ...onFields.sort((a, b) => b.text.length - a.text.length)];
}

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** One line for the inbox saying why a document is waiting for a person. Empty when it is ready. */
export function reason(key: string, failed: Check[]): string {
  if (failed.length) {
    const said = failed.map((check) => sentence(check.problem ?? check.label));
    return failed.length <= 2 ? said.join(" ") : `${said[0]} And ${failed.length - 1} more.`;
  }
  const recording = RECORDINGS[key];
  // A note about the whole page ends with what matters; notes on single values are named, and read on the document itself.
  if (recording.notes.length) return sentence(recording.notes[0].split(/(?<=\.)\s+/).at(-1)!);
  const labels = recording.fields.filter((field) => field.note).map((field) => `the ${field.label.toLowerCase()}`);
  if (!labels.length) return "";
  return `The AI left ${labels.length === 1 ? "a note" : "notes"} on ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`}.`;
}
