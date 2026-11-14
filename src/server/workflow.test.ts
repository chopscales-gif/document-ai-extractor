import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createEmbeddedDb, type Db } from "@/db/client";
import { ensureSandbox, resetSandbox } from "@/db/sandbox";
import { documents, events, vendors } from "@/db/schema";
import { documentView, inbox } from "./queries";
import { WorkflowError, addVendor, approve, approveClean, reject, reopen, saveValues, type Ctx } from "./workflow";

/** End-to-end tests of the review workflow against a real (in-memory) Postgres. */

let db: Db;
let count = 0;

/** A fresh sandbox for each test, so tests cannot affect each other. */
async function fresh(): Promise<{ ctx: Ctx; id: (key: string) => string }> {
  const sandboxId = `visitor-${++count}`;
  await ensureSandbox(db, sandboxId);
  const rows = await db.select().from(documents).where(eq(documents.sandboxId, sandboxId));
  return { ctx: { db, sandboxId }, id: (key) => rows.find((row) => row.key === key)!.id };
}

const row = async (ctx: Ctx, id: string) => (await inbox(ctx)).find((doc) => doc.id === id)!;

beforeAll(async () => {
  db = await createEmbeddedDb();
});

describe("a new visitor", () => {
  it("gets twelve documents, all waiting, with the values the AI read", async () => {
    const { ctx, id } = await fresh();
    const rows = await inbox(ctx);
    expect(rows).toHaveLength(12);
    expect(rows.every((doc) => doc.status === "needs_review")).toBe(true);
    expect((await row(ctx, id("lumber-invoice"))).values.total).toBe("9518.74");
  });

  it("is seeded once, however many times the page loads", async () => {
    const { ctx } = await fresh();
    await ensureSandbox(db, ctx.sandboxId);
    expect(await inbox(ctx)).toHaveLength(12);
  });

  it("cannot see or change another visitor's documents", async () => {
    const mine = await fresh();
    const theirs = await fresh();
    await expect(approve(mine.ctx, theirs.id("produce-invoice"))).rejects.toThrow(WorkflowError);
    expect(await documentView(mine.ctx, theirs.id("produce-invoice"))).toBeNull();
  });
});

describe("correcting a value", () => {
  it("saves it tidied, records the change, and runs the checks again", async () => {
    const { ctx, id } = await fresh();
    const plumbing = id("plumbing-invoice");
    expect((await row(ctx, plumbing)).assessment.failed.map((check) => check.key)).toEqual(["lines_sum"]);

    await saveValues(ctx, plumbing, { subtotal: " $418.6 " });
    const after = await documentView(ctx, plumbing);
    expect(after!.values.subtotal).toBe("418.60");
    // The lines now add up, and the vendor's total no longer does: the mistake is on the page, not in the reading.
    expect(after!.assessment.failed.map((check) => check.key)).toEqual(["total_sum"]);
    expect(after!.history.at(-1)).toBe("Subtotal changed from 428.60 to 418.60.");
  });

  it("refuses an amount or a date that is not one, naming the field", async () => {
    const { ctx, id } = await fresh();
    await expect(saveValues(ctx, id("linen-invoice"), { total: "about 180" })).rejects.toThrow("Total needs to be an amount");
    await expect(saveValues(ctx, id("linen-invoice"), { due_date: "next week" })).rejects.toThrow("Due date needs to be a date");
  });

  it("ignores fields the document does not have, and records nothing when nothing changed", async () => {
    const { ctx, id } = await fresh();
    const linen = id("linen-invoice");
    await saveValues(ctx, linen, { total: "182.33", nonsense: "x" });
    const view = await documentView(ctx, linen);
    expect(view!.values).not.toHaveProperty("nonsense");
    expect(view!.history).toHaveLength(1);
  });
});

describe("approving and rejecting", () => {
  it("approves a clean document without a note", async () => {
    const { ctx, id } = await fresh();
    await approve(ctx, id("produce-invoice"));
    expect((await row(ctx, id("produce-invoice"))).status).toBe("approved");
  });

  it("will not approve a document with a failed check unless a note says why", async () => {
    const { ctx, id } = await fresh();
    const plumbing = id("plumbing-invoice");
    await expect(approve(ctx, plumbing)).rejects.toThrow("add a note saying why");
    await approve(ctx, plumbing, "Vendor confirmed by phone, 432.12 is right.");
    const view = await documentView(ctx, plumbing);
    expect(view!.status).toBe("approved");
    expect(view!.note).toBe("Vendor confirmed by phone, 432.12 is right.");
  });

  it("needs a reason to reject", async () => {
    const { ctx, id } = await fresh();
    await expect(reject(ctx, id("w9-ironwood"), " ")).rejects.toThrow(WorkflowError);
    await reject(ctx, id("w9-ironwood"), "Not signed. Sent back to the vendor.");
    expect((await row(ctx, id("w9-ironwood"))).status).toBe("rejected");
  });

  it("will not change or decide a document twice, until it is reopened", async () => {
    const { ctx, id } = await fresh();
    const produce = id("produce-invoice");
    await approve(ctx, produce);
    await expect(approve(ctx, produce)).rejects.toThrow("already approved");
    await expect(saveValues(ctx, produce, { total: "1.00" })).rejects.toThrow(WorkflowError);
    await reopen(ctx, produce);
    expect((await row(ctx, produce)).status).toBe("needs_review");
    await expect(reopen(ctx, produce)).rejects.toThrow(WorkflowError);
  });

  it("stops flagging the second copy of an invoice once the first is rejected", async () => {
    const { ctx, id } = await fresh();
    expect((await row(ctx, id("linen-invoice-copy"))).assessment.failed.map((check) => check.key)).toEqual(["duplicate"]);
    await reject(ctx, id("linen-invoice"), "Wrong client.");
    expect((await row(ctx, id("linen-invoice-copy"))).assessment.failed).toEqual([]);
  });
});

describe("vendors on file", () => {
  it("adds the vendor for that client, which clears the flag", async () => {
    const { ctx, id } = await fresh();
    const lab = id("lab-invoice");
    await addVendor(ctx, lab);
    expect((await row(ctx, lab)).assessment.clean).toBe(true);
    await expect(addVendor(ctx, lab)).rejects.toThrow("already on file");
  });

  it("has nothing to add from a receipt", async () => {
    const { ctx, id } = await fresh();
    await expect(addVendor(ctx, id("lunch-receipt"))).rejects.toThrow(WorkflowError);
  });
});

describe("approving the clean ones together", () => {
  it("approves the five that passed everything and leaves the rest waiting", async () => {
    const { ctx } = await fresh();
    expect(await approveClean(ctx)).toBe(5);
    const rows = await inbox(ctx);
    expect(rows.filter((doc) => doc.status === "approved").map((doc) => doc.sample.key)).toEqual(["produce-invoice", "linen-invoice", "w9-kestrel", "lumber-invoice", "hardware-receipt"]);
    expect(rows.filter((doc) => doc.status === "needs_review")).toHaveLength(7);
    await expect(approveClean(ctx)).rejects.toThrow(WorkflowError);
  });
});

describe("the review screen", () => {
  it("knows where on the page every printed value is, and which document is next", async () => {
    const { ctx, id } = await fresh();
    const view = (await documentView(ctx, id("lumber-invoice")))!;
    expect(view.fields.find((field) => field.key === "total")!.boxes[0].page).toBe(2);
    expect(view.fields.find((field) => field.key === "category")!.boxes).toEqual([]);
    expect(view.lines).toHaveLength(22);
    expect(view.nextId).toBe(id("concrete-invoice"));
  });
});

describe("resetting", () => {
  it("puts back the starting inbox and removes everything the visitor did", async () => {
    const { ctx, id } = await fresh();
    await addVendor(ctx, id("lab-invoice"));
    await approveClean(ctx);
    await resetSandbox(db, ctx.sandboxId);
    const rows = await inbox(ctx);
    expect(rows.every((doc) => doc.status === "needs_review")).toBe(true);
    expect(await db.select().from(vendors).where(eq(vendors.sandboxId, ctx.sandboxId))).toHaveLength(5);
    expect(await db.select().from(events).where(eq(events.sandboxId, ctx.sandboxId))).toHaveLength(12);
  });
});
