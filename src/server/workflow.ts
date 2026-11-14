import { and, asc, eq } from "drizzle-orm";
import { RECORDINGS, type RecordedField } from "@/data/recordings";
import type { Db } from "@/db/client";
import { documents, events, vendors, type Document } from "@/db/schema";
import { assess } from "@/lib/assess";
import { sameName, type Values } from "@/lib/checks";
import { toCents } from "@/lib/money";
import { SAMPLE_BY_KEY } from "@/lib/samples";

/**
 * What a reviewer can do to a document: correct what was read, approve it,
 * reject it, reopen it. Every function works inside one visitor's sandbox and
 * refuses, with a reason a person can act on, anything the rules do not allow.
 */

export type Ctx = { db: Db; sandboxId: string };

/** A refusal the screen can show as it is. */
export class WorkflowError extends Error {}

export async function loadInbox(ctx: Ctx) {
  const [docs, onFile] = await Promise.all([
    ctx.db.select().from(documents).where(eq(documents.sandboxId, ctx.sandboxId)).orderBy(asc(documents.position)),
    ctx.db.select({ client: vendors.client, name: vendors.name }).from(vendors).where(eq(vendors.sandboxId, ctx.sandboxId)).orderBy(asc(vendors.id)),
  ]);
  return { docs, onFile };
}

async function find(ctx: Ctx, id: string): Promise<Document> {
  const [doc] = await ctx.db.select().from(documents).where(and(eq(documents.sandboxId, ctx.sandboxId), eq(documents.id, id)));
  if (!doc) throw new WorkflowError("That document is not in your inbox. It may have gone when the demo was reset.");
  return doc;
}

async function underReview(ctx: Ctx, id: string): Promise<Document> {
  const doc = await find(ctx, id);
  if (doc.status !== "needs_review") throw new WorkflowError(`This document is already ${doc.status}. Reopen it to change it.`);
  return doc;
}

const log = (ctx: Ctx, documentId: string, text: string) => ctx.db.insert(events).values({ sandboxId: ctx.sandboxId, documentId, text });

/** One corrected value, tidied into the form it is stored in, or a refusal that names the field. */
function tidy(field: RecordedField, input: string): string {
  const text = input.trim();
  if (!text) return "";
  if (field.kind === "money") {
    const cents = toCents(text);
    if (cents === null) throw new WorkflowError(`${field.label} needs to be an amount, like 182.33.`);
    return (cents / 100).toFixed(2);
  }
  if (field.kind === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) throw new WorkflowError(`${field.label} needs to be a date.`);
    return text;
  }
  if (text.length > 120) throw new WorkflowError(`${field.label} is too long.`);
  return text;
}

/** Saves corrections to what was read. Fields the document does not have are ignored. */
export async function saveValues(ctx: Ctx, id: string, input: Values): Promise<Document> {
  const doc = await underReview(ctx, id);
  const values = { ...doc.values };
  const changes: string[] = [];
  for (const field of RECORDINGS[doc.key].fields) {
    if (!(field.key in input)) continue;
    const next = tidy(field, input[field.key]);
    if (next === values[field.key]) continue;
    changes.push(`${field.label} changed from ${values[field.key] || "blank"} to ${next || "blank"}.`);
    values[field.key] = next;
  }
  if (!changes.length) return doc;
  await ctx.db.update(documents).set({ values }).where(eq(documents.id, doc.id));
  await ctx.db.insert(events).values(changes.map((text) => ({ sandboxId: ctx.sandboxId, documentId: doc.id, text })));
  return { ...doc, values };
}

/**
 * Approves a document. If one of its checks fails it can still be approved,
 * since the reviewer may know something the page does not say, but only
 * with a note saying why.
 */
export async function approve(ctx: Ctx, id: string, note = ""): Promise<void> {
  const doc = await underReview(ctx, id);
  const { docs, onFile } = await loadInbox(ctx);
  const { failed } = assess(doc, docs, onFile);
  const reason = note.trim();
  if (failed.length && reason.length < 3) {
    throw new WorkflowError(`${failed.length === 1 ? "A check fails" : `${failed.length} checks fail`} on this document. To approve it anyway, add a note saying why.`);
  }
  await ctx.db.update(documents).set({ status: "approved", note: reason }).where(eq(documents.id, doc.id));
  await log(ctx, doc.id, reason ? `Approved, with the note: ${reason}` : "Approved.");
}

export async function reject(ctx: Ctx, id: string, note = ""): Promise<void> {
  const doc = await underReview(ctx, id);
  const reason = note.trim();
  if (reason.length < 3) throw new WorkflowError("Add a note saying why this is rejected, so whoever sent it knows what to fix.");
  await ctx.db.update(documents).set({ status: "rejected", note: reason }).where(eq(documents.id, doc.id));
  await log(ctx, doc.id, `Rejected: ${reason}`);
}

export async function reopen(ctx: Ctx, id: string): Promise<void> {
  const doc = await find(ctx, id);
  if (doc.status === "needs_review") throw new WorkflowError("This document is already open for review.");
  await ctx.db.update(documents).set({ status: "needs_review", note: "" }).where(eq(documents.id, doc.id));
  await log(ctx, doc.id, `Reopened after being ${doc.status}.`);
}

/** Adds the vendor on an invoice to the client's vendors, so their bills stop being flagged. */
export async function addVendor(ctx: Ctx, id: string): Promise<void> {
  const doc = await underReview(ctx, id);
  const name = doc.values.vendor ?? "";
  if (RECORDINGS[doc.key].kind !== "invoice" || !name) throw new WorkflowError("There is no vendor name on this document to add.");
  const client = SAMPLE_BY_KEY[doc.key].client;
  const { onFile } = await loadInbox(ctx);
  if (onFile.some((vendor) => vendor.client === client && sameName(vendor.name, name))) throw new WorkflowError(`${name} is already on file for ${client}.`);
  await ctx.db.insert(vendors).values({ sandboxId: ctx.sandboxId, client, name });
  await log(ctx, doc.id, `${name} added to the vendors on file for ${client}.`);
}

/** Approves every document that passed all its checks and that the AI flagged nothing on. Returns how many. */
export async function approveClean(ctx: Ctx): Promise<number> {
  const { docs, onFile } = await loadInbox(ctx);
  const clean = docs.filter((doc) => doc.status === "needs_review" && assess(doc, docs, onFile).clean);
  if (!clean.length) throw new WorkflowError("Nothing is waiting that passed every check. Open the others to review them.");
  for (const doc of clean) {
    await ctx.db.update(documents).set({ status: "approved", note: "" }).where(eq(documents.id, doc.id));
    await log(ctx, doc.id, "Approved along with the other documents that passed every check.");
  }
  return clean.length;
}
