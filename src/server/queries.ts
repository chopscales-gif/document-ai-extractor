import { and, asc, eq } from "drizzle-orm";
import { RECORDINGS, type FieldKind, type Line } from "@/data/recordings";
import { WORDS } from "@/data/words";
import { events, type DocStatus } from "@/db/schema";
import { assess, contextFor, type Assessment } from "@/lib/assess";
import type { CheckContext, Values } from "@/lib/checks";
import { locate, type Box } from "@/lib/locate";
import { SAMPLE_BY_KEY, pageImage, type Sample } from "@/lib/samples";
import { loadInbox, type Ctx } from "./workflow";

/** What the screens read. Nothing here changes anything. */

export type InboxRow = { id: string; sample: Sample; kind: "invoice" | "receipt" | "w9"; title: string; status: DocStatus; values: Values; note: string; assessment: Assessment };

export async function inbox(ctx: Ctx): Promise<InboxRow[]> {
  const { docs, onFile } = await loadInbox(ctx);
  return docs.map((doc) => ({
    id: doc.id,
    sample: SAMPLE_BY_KEY[doc.key],
    kind: RECORDINGS[doc.key].kind,
    title: RECORDINGS[doc.key].title,
    status: doc.status,
    values: doc.values,
    note: doc.note,
    assessment: assess(doc, docs, onFile),
  }));
}

export type FieldView = {
  key: string;
  label: string;
  kind: FieldKind;
  /** What the AI read. */
  recorded: string;
  /** The text as printed, when the value was read from the page. */
  raw?: string;
  note?: string;
  suggested: boolean;
  /** Where on the page it was read from. Empty for a value that is not printed anywhere. */
  boxes: Box[];
};
export type LineView = Line & { boxes: Box[] };

export type DocumentView = InboxRow & {
  /** `crop` is how much of the page, from the top, holds anything printed: the blank foot is not shown. */
  pages: { src: string; width: number; height: number; crop: number }[];
  fields: FieldView[];
  lines: LineView[];
  pageNotes: string[];
  context: CheckContext;
  history: string[];
  /** The next document still waiting for review, if there is one. */
  nextId: string | null;
};

export async function documentView(ctx: Ctx, id: string): Promise<DocumentView | null> {
  const { docs, onFile } = await loadInbox(ctx);
  const doc = docs.find((row) => row.id === id);
  if (!doc) return null;
  const recording = RECORDINGS[doc.key];
  const pages = WORDS[doc.key].pages;
  const history = await ctx.db.select({ text: events.text }).from(events).where(and(eq(events.sandboxId, ctx.sandboxId), eq(events.documentId, doc.id))).orderBy(asc(events.id));
  const waiting = docs.filter((row) => row.status === "needs_review" && row.id !== doc.id);

  return {
    id: doc.id,
    sample: SAMPLE_BY_KEY[doc.key],
    kind: recording.kind,
    title: recording.title,
    status: doc.status,
    values: doc.values,
    note: doc.note,
    assessment: assess(doc, docs, onFile),
    pages: pages.map((page, index) => ({
      src: pageImage(doc.key, index + 1),
      width: page.width,
      height: page.height,
      crop: Math.min(1, Math.max(0.3, ...page.words.map((word) => word[2] + word[4])) + 0.05),
    })),
    fields: recording.fields.map((field) => {
      const page = field.page ?? 1;
      return {
        key: field.key,
        label: field.label,
        kind: field.kind,
        recorded: field.value,
        raw: field.raw,
        note: field.note,
        suggested: field.suggested ?? false,
        boxes: field.raw ? locate(pages[page - 1], page, field.raw, field.near) : [],
      };
    }),
    lines: recording.lines.map(({ raw, page = 1, ...line }) => ({ ...line, boxes: locate(pages[page - 1], page, raw.join(" ")) })),
    pageNotes: recording.notes,
    context: contextFor(doc, docs, onFile),
    history: history.map((event) => event.text),
    nextId: (waiting.find((row) => row.position > doc.position) ?? waiting[0])?.id ?? null,
  };
}
