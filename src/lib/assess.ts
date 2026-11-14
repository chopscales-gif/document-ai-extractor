import { RECORDINGS } from "@/data/recordings";
import { runChecks, type Check, type CheckContext, type Values } from "./checks";
import { SAMPLE_BY_KEY } from "./samples";

/** The parts of a stored document that decide what needs a person's attention. */
export type DocState = { key: string; position: number; status: string; values: Values };
export type VendorOnFile = { client: string; name: string };

export type Assessment = {
  checks: Check[];
  failed: Check[];
  /** What the AI flagged while reading, each one naming the field it is about. */
  notes: string[];
  /** Nothing failed and nothing was flagged, so it can be approved without opening it. */
  clean: boolean;
};

/** What a document's checks are compared against: the client's vendors, and the invoices that arrived before it. */
export function contextFor(doc: DocState, all: DocState[], vendors: VendorOnFile[]): CheckContext {
  const client = SAMPLE_BY_KEY[doc.key].client;
  return {
    vendorsOnFile: vendors.filter((vendor) => vendor.client === client).map((vendor) => vendor.name),
    earlier: all
      .filter((other) => other.position < doc.position && other.status !== "rejected" && RECORDINGS[other.key].kind === "invoice")
      .map((other) => ({ vendor: other.values.vendor ?? "", number: other.values.number ?? "" })),
  };
}

export function assess(doc: DocState, all: DocState[], vendors: VendorOnFile[]): Assessment {
  const recording = RECORDINGS[doc.key];
  const checks = runChecks(recording.kind, doc.values, recording.lines, contextFor(doc, all, vendors));
  const failed = checks.filter((check) => !check.ok);
  const notes = [...recording.fields.filter((field) => field.note).map((field) => `${field.label}: ${field.note}`), ...recording.notes];
  return { checks, failed, notes, clean: failed.length === 0 && notes.length === 0 };
}
