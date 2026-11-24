"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { resetSandbox } from "@/db/sandbox";
import { getCtx, sandboxIdFromCookie } from "./session";
import { WorkflowError, addVendor, approve, approveClean, reject, reopen, saveValues, type Ctx } from "./workflow";

/**
 * Server actions: the thin layer between the screens and the workflow. Each one
 * validates its input, runs a workflow function in the visitor's sandbox, and
 * returns a plain result the screen can show.
 */

/** `goto` is where the screen should go next, when the action decides that. */
export type ActionResult = { ok: true; goto?: string } | { ok: false; error: string };

async function run(work: (ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  let goto: string | void;
  try {
    goto = await work(await getCtx());
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong on our side. Try again, or reset the demo from the bar at the top." };
  }
  revalidatePath("/", "layout");
  return goto ? { ok: true, goto } : { ok: true };
}

const id = z.uuid();
const values = z.record(z.string().max(40), z.string().max(400));
const BAD_INPUT: ActionResult = { ok: false, error: "That did not look right. Reload the page and try again." };

const edit = z.object({ id, values });

export async function saveAction(input: z.input<typeof edit>): Promise<ActionResult> {
  const parsed = edit.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run(async (ctx) => void (await saveValues(ctx, parsed.data.id, parsed.data.values)));
}

/** Adds the vendor named on the invoice to the client's file, saving any corrections on screen first. */
export async function addVendorAction(input: z.input<typeof edit>): Promise<ActionResult> {
  const parsed = edit.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run(async (ctx) => {
    await saveValues(ctx, parsed.data.id, parsed.data.values);
    await addVendor(ctx, parsed.data.id);
  });
}

const decision = z.object({ id, values, decision: z.enum(["approve", "reject"]), note: z.string().max(400) });

/** Approves, or holds for the client, saving any corrections on screen first, then goes back to the inbox. */
export async function decideAction(input: z.input<typeof decision>): Promise<ActionResult> {
  const parsed = decision.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run(async (ctx) => {
    await saveValues(ctx, parsed.data.id, parsed.data.values);
    await (parsed.data.decision === "approve" ? approve : reject)(ctx, parsed.data.id, parsed.data.note);
    return "/inbox";
  });
}

export async function reopenAction(documentId: string): Promise<ActionResult> {
  if (!id.safeParse(documentId).success) return BAD_INPUT;
  return run((ctx) => reopen(ctx, documentId));
}

export async function approveCleanAction(): Promise<ActionResult> {
  return run(async (ctx) => {
    await approveClean(ctx);
    return "/export";
  });
}

/** Throws away this visitor's changes and starts again from the twelve unread documents. */
export async function resetDemoAction(): Promise<void> {
  await resetSandbox(await getDb(), await sandboxIdFromCookie());
  revalidatePath("/", "layout");
  redirect("/");
}
