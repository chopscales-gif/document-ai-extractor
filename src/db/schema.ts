import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Every row belongs to a sandbox: one visitor's private copy of the demo data.
 * Deleting the sandbox row removes everything that visitor changed. Every
 * foreign key has an index so that the cascade stays quick.
 */
export const sandboxes = pgTable("sandboxes", {
  id: text("id").primaryKey(),
  /** Used only to purge old sandboxes. */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const sandboxId = () =>
  text("sandbox_id")
    .notNull()
    .references(() => sandboxes.id, { onDelete: "cascade" });

export type DocStatus = "needs_review" | "approved" | "rejected";

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    /** Which sample this is: names its page images, word positions and recorded reading. */
    key: text("key").notNull(),
    /** Order of arrival. */
    position: integer("position").notNull(),
    status: text("status").$type<DocStatus>().notNull().default("needs_review"),
    /** The value of each field as it stands now: the recorded reading, plus any corrections. */
    values: jsonb("values").$type<Record<string, string>>().notNull(),
    /** Why it was approved despite a failed check, or why it was rejected. */
    note: text("note").notNull().default(""),
  },
  (t) => [index("documents_sandbox").on(t.sandboxId)],
);

/** Vendors a client already pays. */
export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    sandboxId: sandboxId(),
    client: text("client").notNull(),
    name: text("name").notNull(),
  },
  (t) => [index("vendors_sandbox").on(t.sandboxId)],
);

/** What happened to a document, oldest first: read, corrected, approved, reopened. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    sandboxId: sandboxId(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
  },
  (t) => [index("events_sandbox").on(t.sandboxId), index("events_document").on(t.documentId)],
);

export type Document = typeof documents.$inferSelect;
