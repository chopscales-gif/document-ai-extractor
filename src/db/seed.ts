import { randomUUID } from "node:crypto";
import { RECORDINGS } from "@/data/recordings";
import { SAMPLES, VENDORS_ON_FILE } from "@/lib/samples";
import type { Db } from "./client";
import { documents, events, vendors } from "./schema";

/**
 * The inbox a new visitor sees: twelve documents, each already read, none yet
 * reviewed. The values start as the recorded reading, untouched.
 */
export async function seedSandbox({ db, sandboxId }: { db: Db; sandboxId: string }): Promise<void> {
  const rows = SAMPLES.map((sample, position) => ({
    id: randomUUID(),
    sandboxId,
    key: sample.key,
    position,
    values: Object.fromEntries(RECORDINGS[sample.key].fields.map((field) => [field.key, field.value])),
  }));
  await db.insert(documents).values(rows);
  await db.insert(events).values(rows.map((row) => ({ sandboxId, documentId: row.id, text: `${SAMPLES[row.position].source}. Read by the AI.` })));
  await db.insert(vendors).values(Object.entries(VENDORS_ON_FILE).flatMap(([client, names]) => names.map((name) => ({ sandboxId, client, name }))));
}
