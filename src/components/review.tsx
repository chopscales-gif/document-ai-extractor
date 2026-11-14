"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { runChecks } from "@/lib/checks";
import type { Box } from "@/lib/locate";
import { fmtAmount, fmtDate } from "@/lib/money";
import { addVendorAction, decideAction, reopenAction, saveAction, type ActionResult } from "@/server/actions";
import type { DocumentView, FieldView } from "@/server/queries";

/**
 * The review screen: the page on one side, what was read from it on the other.
 * Pointing at a value shows where on the page it came from, and the checks
 * rerun as values are corrected, before anything is saved.
 */

type Active = { field: string } | { line: number } | null;

/** Fields with a fixed set of answers. */
const CHOICES: Record<string, string[]> = {
  signed: ["Yes", "No"],
  tin_type: ["EIN", "SSN"],
  classification: ["Individual/sole proprietor", "C corporation", "S corporation", "Partnership", "Trust/estate", "LLC"],
};

const shown = (field: FieldView, value: string) => (field.kind === "money" ? fmtAmount(value) : field.kind === "date" ? fmtDate(value) : value) || "blank";

export function Review({ doc }: { doc: DocumentView }) {
  const router = useRouter();
  const open = doc.status === "needs_review";
  const [values, setValues] = useState(doc.values);
  const [active, setActive] = useState<Active>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const viewer = useRef<HTMLDivElement>(null);

  const checks = useMemo(() => runChecks(doc.kind, values, doc.lines, doc.context), [doc.kind, doc.lines, doc.context, values]);
  const failed = checks.filter((check) => !check.ok);
  const dirty = doc.fields.some((field) => values[field.key] !== doc.values[field.key]);

  const activeBoxes: Box[] = !active ? [] : "field" in active ? (doc.fields.find((field) => field.key === active.field)?.boxes ?? []) : (doc.lines[active.line]?.boxes ?? []);

  // Beside the page (wide screens), bring the highlighted spot into view. On a phone the page is above, and a close-up appears under the field instead.
  useEffect(() => {
    if (!active || !window.matchMedia("(min-width: 1024px)").matches) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewer.current?.querySelector("[data-active]")?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  }, [active]);

  function act(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else if (result.goto) router.push(result.goto);
    });
  }

  const set = (key: string, value: string) => {
    setError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const edits = { id: doc.id, values };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <div ref={viewer} className="rounded-lg bg-desk p-3 sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-auto">
        <div className={`mx-auto grid gap-4 ${doc.pages[0].width < 1000 ? "max-w-sm" : ""}`}>
          {doc.pages.map((page, index) => (
            <div key={page.src} className="relative bg-white shadow-[0_1px_2px_rgb(23_37_31/0.25),0_8px_24px_rgb(23_37_31/0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed sample scans, already sized for the screen */}
              <img src={page.src} width={page.width} height={page.height} alt={`Page ${index + 1} of the ${doc.title} document, as it arrived`} className="block h-auto w-full" />
              {doc.fields.flatMap((field) =>
                field.boxes
                  .filter((box) => box.page === index + 1)
                  .map((box, n) => {
                    const on = active !== null && "field" in active && active.field === field.key;
                    return (
                      <button
                        key={`${field.key}-${n}`}
                        type="button"
                        tabIndex={-1}
                        aria-label={`${field.label}: show what was read`}
                        title={field.label}
                        data-active={on ? "" : undefined}
                        className="source-box"
                        style={place(box)}
                        onClick={() => {
                          setActive({ field: field.key });
                          document.getElementById(`field-${field.key}`)?.focus({ preventScroll: window.matchMedia("(min-width: 1024px)").matches });
                        }}
                      />
                    );
                  }),
              )}
              {active !== null && "line" in active && activeBoxes.filter((box) => box.page === index + 1).map((box, n) => <span key={n} data-active="" className="source-box" style={place(box)} />)}
              {doc.pages.length > 1 && <p className="absolute right-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">Page {index + 1}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        <section aria-labelledby="read-heading" className="panel">
          <div className="border-b border-line px-4 py-3">
            <h2 id="read-heading" className="font-display text-xl font-semibold">
              What the AI read
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              Choose a value to see where on the page it came from. {open ? "Correct anything that is wrong. " : ""}
              This reading was recorded ahead of time and is replayed here. <Link href="/about" className="underline underline-offset-2">How this demo works</Link>
            </p>
          </div>

          {doc.pageNotes.map((text) => (
            <AiNote key={text} className="mx-4 mt-3">
              {text}
            </AiNote>
          ))}

          <div className="px-2 py-2">
            {doc.fields.map((field) => {
              const on = active !== null && "field" in active && active.field === field.key;
              const value = values[field.key] ?? "";
              const changed = value !== field.recorded;
              const id = `field-${field.key}`;
              const common = { id, value, disabled: !open, className: "field", onFocus: () => setActive({ field: field.key }) };
              return (
                <div key={field.key} className={`rounded px-2 py-2 ${on ? "bg-mark-soft" : ""}`}>
                  <div className="grid gap-x-3 gap-y-1 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center">
                    <label htmlFor={id} className="text-sm font-medium text-muted">
                      {on ? <span className="mark">{field.label}</span> : field.label}
                    </label>
                    {CHOICES[field.key] ? (
                      <select {...common} onChange={(event) => set(field.key, event.target.value)}>
                        {!CHOICES[field.key].includes(value) && <option value={value}>{value || "Not filled in"}</option>}
                        {CHOICES[field.key].map((choice) => (
                          <option key={choice}>{choice}</option>
                        ))}
                      </select>
                    ) : (
                      <input {...common} type={field.kind === "date" ? "date" : "text"} inputMode={field.kind === "money" ? "decimal" : undefined} autoComplete="off" onChange={(event) => set(field.key, event.target.value)} />
                    )}
                  </div>
                  <div className="sm:pl-[10.25rem]">
                    {field.suggested && <p className="mt-1 text-sm text-muted">Suggested by the AI. It is not printed on the page.</p>}
                    {changed && (
                      <p className="mt-1 text-sm">
                        You changed this. The AI read {shown(field, field.recorded)}.{" "}
                        {open && (
                          <button type="button" className="cursor-pointer font-semibold underline underline-offset-2" onClick={() => set(field.key, field.recorded)}>
                            Put it back
                          </button>
                        )}
                      </p>
                    )}
                    {field.note && <AiNote className="mt-1.5">{field.note}</AiNote>}
                    {on && field.boxes.length > 0 && <CloseUp box={field.boxes[0]} page={doc.pages[field.boxes[0].page - 1]} label={field.label} />}
                    {on && !field.boxes.length && !field.suggested && <p className="mt-1 text-sm text-muted">Nothing on the page to point to: the AI found this blank.</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {doc.lines.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <h3 className="font-semibold">Lines</h3>
              <table className="mt-2 w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="py-1.5 pr-2 font-medium">Description</th>
                    <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                    <th className="px-2 py-1.5 text-right font-medium">Price</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lines.map((line, index) => {
                    const on = active !== null && "line" in active && active.line === index;
                    return (
                      <tr key={index} className={`border-b border-line/60 last:border-0 ${on ? "bg-mark-soft" : ""}`}>
                        <td className="py-0.5 pr-2">
                          <button type="button" aria-pressed={on} className="min-h-9 w-full cursor-pointer text-left hover:underline" onClick={() => setActive({ line: index })}>
                            {line.description}
                          </button>
                        </td>
                        <td className="px-2 text-right">{line.qty}</td>
                        <td className="px-2 text-right">{fmtAmount(line.unitPrice)}</td>
                        <td className="pl-2 text-right">{fmtAmount(line.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="checks-heading" className="panel px-4 py-3">
          <h2 id="checks-heading" className="font-display text-xl font-semibold">
            Checks
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted">Plain arithmetic and lookups, not AI. They run again as you correct a value.</p>
          <ul className="mt-3 grid gap-2.5">
            {checks.map((check) => (
              <li key={check.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
                <span aria-hidden className={`mt-0.5 grid size-5 place-items-center rounded-full text-xs font-bold text-white ${check.ok ? "bg-accent" : "bg-flag"}`}>
                  {check.ok ? "✓" : "!"}
                </span>
                <div>
                  <p className="font-medium leading-snug">
                    <span className="sr-only">{check.ok ? "Passed: " : "Failed: "}</span>
                    {check.label}
                  </p>
                  <p className={`text-sm leading-snug ${check.ok ? "text-muted" : "text-flag"}`}>{check.detail}</p>
                  {check.key === "vendor" && !check.ok && open && values.vendor && (
                    <button type="button" disabled={pending} className="btn btn-quiet mt-2 min-h-9 px-3 py-1 text-sm" onClick={() => act(() => addVendorAction(edits))}>
                      Add {values.vendor} to the file
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="decision-heading" className="panel px-4 py-4">
          <h2 id="decision-heading" className="font-display text-xl font-semibold">
            {open ? "Your decision" : doc.status === "approved" ? "Approved" : "Rejected"}
          </h2>
          {open ? (
            <>
              <p className="mt-1 text-sm leading-snug text-muted">
                {failed.length ? `${failed.length === 1 ? "A check fails" : `${failed.length} checks fail`}. You can still approve it, with a note saying why.` : "Every check passes."} Rejecting always needs a note.
              </p>
              <label htmlFor="note" className="mt-3 block text-sm font-medium">
                Note {failed.length ? "" : <span className="font-normal text-muted">(optional to approve)</span>}
              </label>
              <textarea id="note" rows={2} maxLength={400} value={note} onChange={(event) => {
                  setError(null);
                  setNote(event.target.value);
                }} className="field mt-1" placeholder={failed.length ? "Why this is fine to approve, or what needs fixing" : ""} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={pending} className="btn btn-primary" onClick={() => act(() => decideAction({ ...edits, decision: "approve", note }))}>
                  Approve
                </button>
                <button type="button" disabled={pending} className="btn btn-danger" onClick={() => act(() => decideAction({ ...edits, decision: "reject", note }))}>
                  Reject
                </button>
                {dirty && (
                  <button type="button" disabled={pending} className="btn btn-quiet" onClick={() => act(() => saveAction(edits))}>
                    Save corrections
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {doc.note && <p className="mt-2 leading-snug">Note: {doc.note}</p>}
              <p className="mt-2 text-sm leading-snug text-muted">{doc.status === "approved" ? (doc.kind === "w9" ? "It is on the Export page with the vendor tax records." : "It is on the Export page, ready for the books.") : "It will not be exported."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={pending} className="btn btn-quiet" onClick={() => act(() => reopenAction(doc.id))}>
                  Reopen for review
                </button>
                {doc.nextId && (
                  <Link href={`/documents/${doc.nextId}`} className="btn btn-primary">
                    Next document
                  </Link>
                )}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-flag">
              {error}
            </p>
          )}
        </section>

        <section aria-labelledby="history-heading" className="px-4 pb-2">
          <h2 id="history-heading" className="text-sm font-semibold">
            History
          </h2>
          <ol className="mt-1 list-decimal pl-5 text-sm leading-relaxed text-muted">
            {doc.history.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/** A box given as fractions of the page, as CSS, with a little room around the text. */
function place(box: Box): React.CSSProperties {
  const pad = 0.003;
  return { left: `${(box.x - pad) * 100}%`, top: `${(box.y - pad) * 100}%`, width: `${(box.w + pad * 2) * 100}%`, height: `${(box.h + pad * 2) * 100}%` };
}

function AiNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`rounded bg-amber-tint px-2.5 py-1.5 text-sm leading-snug text-amber ${className}`}>
      <strong className="font-semibold">AI note.</strong> {children}
    </p>
  );
}

/** On a small screen, the part of the page a value came from, enlarged under the field. */
function CloseUp({ box, page, label }: { box: Box; page: DocumentView["pages"][number]; label: string }) {
  const zoom = page.width < 1000 ? 1.5 : 2.6;
  return (
    <div className="relative mt-2 h-20 overflow-hidden rounded border border-line bg-white lg:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- a crop of the same sample scan */}
      <img
        src={page.src}
        alt={`Close-up of the page where ${label} was read`}
        className="absolute left-1/2 top-1/2 max-w-none"
        style={{ width: `${zoom * 100}%`, transform: `translate(${-(box.x + box.w / 2) * 100}%, ${-(box.y + box.h / 2) * 100}%)` }}
      />
    </div>
  );
}
