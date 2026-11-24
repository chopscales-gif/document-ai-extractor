"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { runChecks } from "@/lib/checks";
import { CHECK_FIELDS, aiNotes, foundBy } from "@/lib/flag";
import type { Box } from "@/lib/locate";
import { fmtAmount, fmtCents, fmtDate, toCents } from "@/lib/money";
import { addVendorAction, decideAction, reopenAction, saveAction, type ActionResult } from "@/server/actions";
import type { DocumentView, FieldView } from "@/server/queries";
import { Tick } from "./ui";

/**
 * The review screen: the page on one side; on the other, the one thing to look
 * at, the decision, and the values that matter most. Choosing a value shows
 * where on the page it came from. Every other value, the corrections, every
 * check and the history are folded away below.
 */

/** A value on the page, or all the line items together. */
type Active = string | null;

/** Fields with a fixed set of answers. */
const CHOICES: Record<string, string[]> = {
  signed: ["Yes", "No"],
  tin_type: ["EIN", "SSN"],
  classification: ["Individual/sole proprietor", "C corporation", "S corporation", "Partnership", "Trust/estate", "LLC"],
};

/** The handful of values shown up front for each kind of document, in reading order. "lines" stands for the line items. */
const UP_FRONT = {
  invoice: ["vendor", "number", "date", "lines", "subtotal", "tax", "total", "balance_due"],
  receipt: ["vendor", "date", "subtotal", "tax", "tip", "total"],
  w9: ["name", "business_name", "address", "tin", "signed", "signature_date"],
} as const;

const shown = (field: FieldView, value: string) => (field.kind === "money" ? (fmtAmount(value) ? `$${fmtAmount(value)}` : "") : field.kind === "date" ? fmtDate(value) : value) || "Blank";

export function Review({ doc }: { doc: DocumentView }) {
  const router = useRouter();
  const open = doc.status === "needs_review";
  const [values, setValues] = useState(doc.values);
  const [mode, setMode] = useState<"hold" | "approve" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const viewer = useRef<HTMLDivElement>(null);

  const checks = useMemo(() => runChecks(doc.kind, values, doc.lines, doc.context), [doc.kind, doc.lines, doc.context, values]);
  const failed = checks.filter((check) => !check.ok);
  const notes = aiNotes(doc.sample.key);
  const dirty = doc.fields.some((field) => values[field.key] !== doc.values[field.key]);
  const flagged = new Set(open ? failed.flatMap((check) => CHECK_FIELDS[check.key] ?? []) : []);

  const byKey = Object.fromEntries(doc.fields.map((field) => [field.key, field]));
  const upFront = (UP_FRONT[doc.kind] as readonly string[]).filter((key) => (key === "lines" ? doc.lines.length > 0 : byKey[key] && (values[key] || byKey[key].boxes.length)));
  // The first flagged value that can be found on the page is lit when the screen opens.
  const [active, setActive] = useState<Active>(() => (open ? (upFront.find((key) => flagged.has(key) && key !== "lines" && byKey[key]?.boxes.length) ?? null) : null));

  const boxesOf = (key: string): Box[] => (key === "lines" ? doc.lines.flatMap((line) => line.boxes) : (byKey[key]?.boxes ?? []));
  const activeBoxes = active ? boxesOf(active) : [];
  const activeLabel = active === "lines" ? "The lines" : active ? byKey[active]?.label : "";

  // Beside the page (wide screens), bring the highlighted spot into view inside the page panel.
  useEffect(() => {
    if (!active || !window.matchMedia("(min-width: 1024px)").matches) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spot = viewer.current?.querySelector<HTMLElement>("[data-active]");
    const box = viewer.current;
    if (!spot || !box) return;
    const top = spot.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }, [active]);

  // The tour asks for a value by name.
  useEffect(() => {
    const pick = (event: Event) => setActive((event as CustomEvent<string>).detail);
    window.addEventListener("review:pick", pick);
    return () => window.removeEventListener("review:pick", pick);
  }, []);

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
  const lead = failed[0];

  return (
    <div className="mt-7 grid items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
      {/* The page as it arrived. */}
      <div data-tour="sheet" className="panel-lg p-3 sm:p-3.5 lg:sticky lg:top-24">
        <div ref={viewer} className="overflow-hidden rounded-xl lg:max-h-[calc(100dvh-10rem)] lg:overflow-auto">
          <div className={`mx-auto grid gap-3 ${doc.pages[0].width < 1000 ? "max-w-sm" : ""}`}>
            {doc.pages.map((page, index) => (
              <div key={page.src} className="overflow-hidden bg-white" style={{ aspectRatio: `${page.width} / ${Math.round(page.height * page.crop)}` }}>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixed sample scans, already sized for the screen */}
                  <img src={page.src} width={page.width} height={page.height} alt={`Page ${index + 1} of the ${doc.title} document, as it arrived`} className="block h-auto w-full" />
                  {upFront
                    .filter((key) => key !== "lines")
                    .flatMap((key) =>
                      boxesOf(key)
                        .filter((box) => box.page === index + 1)
                        .map((box, n) => (
                          <button
                            key={`${key}-${n}`}
                            type="button"
                            tabIndex={-1}
                            aria-label={`${byKey[key].label}: show what was read`}
                            title={byKey[key].label}
                            data-active={active === key ? "" : undefined}
                            className="source-box"
                            style={place(box)}
                            onClick={() => setActive(key)}
                          />
                        )),
                    )}
                  {active && !upFront.includes(active) && activeBoxes.filter((box) => box.page === index + 1).map((box, n) => <span key={n} data-active="" className="source-box" style={place(box)} />)}
                  {active === "lines" && activeBoxes.filter((box) => box.page === index + 1).map((box, n) => <span key={n} data-active="" className="source-box" style={place(box)} />)}
                  {doc.pages.length > 1 && <p className="absolute right-2 top-2 rounded-full bg-ink/85 px-2.5 py-0.5 text-xs font-semibold text-white">Page {index + 1}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="px-1.5 pb-0.5 pt-3 text-[0.9375rem] text-ink-3" aria-live="polite">
          {active ? (activeBoxes.length ? `${activeLabel}: shown where it was read on the page.` : `${activeLabel}: not printed on the page.`) : "Choose a value to see where it is on the page."}
        </p>
      </div>

      <div className="grid min-w-0 gap-6">
        {/* The one thing to look at, and the decision. */}
        <section aria-labelledby="flag-heading" data-tour="flag" className="panel px-6 py-6 sm:px-8 sm:py-7">
          {!open ? (
            <>
              <h2 id="flag-heading" className={`text-[1.75rem] font-extrabold tracking-[-0.02em] ${doc.status === "approved" ? "text-ok" : "text-brick"}`}>
                {doc.status === "approved" ? "Approved" : "Held for the client"}
              </h2>
              {doc.note && <p className="mt-2 text-lg leading-snug">Note: {doc.note}</p>}
              <p className="mt-2 text-ink-2">{doc.status === "approved" ? (doc.kind === "w9" ? "It is in the export, with the vendor tax records." : "It is in the export, ready for the books.") : "It will not be exported until it is reopened and approved."}</p>
            </>
          ) : lead ? (
            <>
              <h2 id="flag-heading" className="text-[0.9375rem] font-semibold text-ink-2">
                {lead.label}
              </h2>
              <p className={`my-3 font-extrabold leading-none tracking-[-0.04em] text-brick tabular-nums ${lead.figure ? "text-[3.25rem] sm:text-[4rem]" : "text-[2rem]"}`}>{lead.figure ?? lead.problem}</p>
              <p className="text-lg leading-[1.45] sm:text-[1.1875rem]">{lead.detail}</p>
              <p className="mt-3 text-[0.9375rem] text-ink-3">{foundBy(lead)}</p>
              {failed.length > 1 && (
                <p className="mt-3 text-[0.9375rem] text-ink-2">
                  Also: {failed
                    .slice(1)
                    .map((check) => check.problem ?? check.label)
                    .join(". ")}
                  .
                </p>
              )}
              {lead.key === "vendor" && values.vendor && (
                <button type="button" disabled={pending} className="link mt-3 inline-flex min-h-11 cursor-pointer items-center text-left" onClick={() => act(() => addVendorAction(edits))}>
                  Add {values.vendor} to the client&apos;s vendor file
                </button>
              )}
            </>
          ) : notes.length ? (
            <>
              <h2 id="flag-heading" className="text-[0.9375rem] font-semibold text-ink-2">
                Every check passed. The AI left a note.
              </h2>
              <p className="mt-3 text-xl font-semibold leading-[1.4]">{notes[0].text}</p>
              <p className="mt-3 text-[0.9375rem] text-ink-3">Written by the AI while reading, so a person decides how to treat it.</p>
            </>
          ) : (
            <>
              <h2 id="flag-heading" className="text-[0.9375rem] font-semibold text-ink-2">
                Every check passed
              </h2>
              <p className="my-3 text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-ok">Nothing to check</p>
              <p className="text-lg leading-[1.45]">All {checks.length} checks pass and the AI flagged nothing.</p>
            </>
          )}

          <div data-tour="decide" className="mt-6">
            {open ? (
              mode === null ? (
                <div className="flex flex-wrap gap-3">
                  {failed.length ? (
                    <>
                      <button type="button" disabled={pending} className="btn btn-primary max-sm:w-full" onClick={() => setMode("hold")}>
                        Hold for the client
                      </button>
                      <button type="button" disabled={pending} className="btn btn-quiet max-sm:w-full" onClick={() => setMode("approve")}>
                        Approve with a note
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" disabled={pending} className="btn btn-primary max-sm:w-full" onClick={() => act(() => decideAction({ ...edits, decision: "approve", note: "" }))}>
                        {pending ? "Approving" : "Approve"}
                      </button>
                      <button type="button" disabled={pending} className="btn btn-quiet max-sm:w-full" onClick={() => setMode("hold")}>
                        Hold for the client
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="note" className="block font-semibold">
                    {mode === "hold" ? "What does the client need to fix?" : "Why is it fine to approve?"}
                  </label>
                  <textarea
                    id="note"
                    rows={2}
                    maxLength={400}
                    autoFocus
                    value={note}
                    onChange={(event) => {
                      setError(null);
                      setNote(event.target.value);
                    }}
                    className="field mt-2 min-h-20 rounded-2xl"
                    placeholder={mode === "hold" ? "For example: send a corrected invoice" : "For example: checked with the vendor by phone"}
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" disabled={pending} className="btn btn-primary max-sm:w-full" onClick={() => act(() => decideAction({ ...edits, decision: mode === "hold" ? "reject" : "approve", note }))}>
                      {pending ? "Saving" : mode === "hold" ? "Hold it" : "Approve it"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="btn btn-quiet max-sm:w-full"
                      onClick={() => {
                        setMode(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-wrap gap-3">
                {doc.nextId && (
                  <Link href={`/documents/${doc.nextId}`} className="btn btn-primary max-sm:w-full">
                    Next document
                  </Link>
                )}
                <button type="button" disabled={pending} className="btn btn-quiet max-sm:w-full" onClick={() => act(() => reopenAction(doc.id))}>
                  Reopen it
                </button>
              </div>
            )}
            {open && dirty && (
              <p className="mt-4 text-[0.9375rem] text-ink-2">
                You changed what was read. The checks above already use your changes.{" "}
                <button type="button" disabled={pending} className="link inline-flex min-h-11 cursor-pointer items-center sm:min-h-0" onClick={() => act(() => saveAction(edits))}>
                  Save the changes
                </button>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 font-semibold leading-snug text-brick">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* The values that matter most, each one found on the page with a click. */}
        <section aria-labelledby="read-heading">
          <h2 id="read-heading" className="text-xl font-bold">
            What the AI read
          </h2>
          <p className="mb-3 mt-1 text-[0.9375rem] text-ink-3">Recorded ahead of time and replayed. Choose a value to find it on the page.</p>
          <ul className="panel overflow-hidden" data-tour="values">
            {upFront.map((key) => {
              const on = active === key;
              const bad = flagged.has(key);
              const field = byKey[key];
              // Line amounts are added in whole cents, as the checks add them.
              const linesTotal = `$${fmtCents(doc.lines.reduce((sum, line) => sum + (toCents(line.amount) ?? 0), 0))}`;
              const value =
                key === "lines"
                  ? doc.lines.length <= 4
                    ? `${doc.lines.map((line) => `$${fmtAmount(line.amount)}`).join(" + ")} = ${linesTotal}`
                    : `${doc.lines.length} lines, adding up to ${linesTotal}`
                  : shown(field, values[key] ?? "");
              const boxes = boxesOf(key);
              return (
                <li key={key} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    data-value={key}
                    aria-pressed={on}
                    onClick={() => setActive(key)}
                    className={`grid w-full cursor-pointer grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-4 px-5 py-3.5 text-left transition-colors sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:px-6 ${on ? "bg-mark" : "hover:bg-mauve-soft"}`}
                  >
                    <span className="text-[0.9375rem] text-ink-2">{key === "lines" ? "Lines" : field.label}</span>
                    <span className={`text-lg font-semibold tabular-nums [overflow-wrap:anywhere] ${bad ? "text-brick" : ""}`}>{value}</span>
                  </button>
                  {on && boxes.length > 0 && <CloseUp boxes={boxes} page={doc.pages[boxes[0].page - 1]} label={key === "lines" ? "the lines" : field.label} />}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid gap-3">
          <details className="fold panel">
            <summary>All {doc.fields.length} values{open ? ", and corrections" : ""}</summary>
            <div className="px-5 pb-5 sm:px-6">
              {notes.length > 0 && (
                <ul className="mb-4 grid gap-2">
                  {notes.map((item) => (
                    <li key={item.text} className="rounded-xl bg-amber-bg px-3.5 py-2.5 text-[0.9375rem] leading-snug">
                      <b className="font-semibold">AI note{item.field ? ` on ${byKey[item.field]?.label.toLowerCase()}` : ""}.</b> {item.text}
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-3">
                {doc.fields.map((field) => {
                  const value = values[field.key] ?? "";
                  const changed = value !== field.recorded;
                  const id = `field-${field.key}`;
                  const common = { id, value, disabled: !open, className: "field", onFocus: () => setActive(field.key) };
                  return (
                    <div key={field.key} className="grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
                      <label htmlFor={id} className="text-[0.9375rem] text-ink-2">
                        {field.label}
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
                      {(field.suggested || changed) && (
                        <p className="text-sm leading-snug text-ink-3 sm:col-start-2">
                          {field.suggested && "Suggested by the AI. It is not printed on the page. "}
                          {changed && (
                            <>
                              You changed this. The AI read {shown(field, field.recorded)}.{" "}
                              {open && (
                                <button type="button" className="link cursor-pointer" onClick={() => set(field.key, field.recorded)}>
                                  Put it back
                                </button>
                              )}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {doc.lines.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-[0.9375rem] tabular-nums">
                    <thead>
                      <tr className="border-b border-line text-left text-ink-3">
                        <th className="py-2 pr-2 font-medium">Line</th>
                        <th className="px-2 py-2 text-right font-medium">Qty</th>
                        <th className="px-2 py-2 text-right font-medium">Price</th>
                        <th className="py-2 pl-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.lines.map((line, index) => (
                        <tr key={index} className="border-b border-line last:border-0">
                          <td className="py-2 pr-2 leading-snug">{line.description}</td>
                          <td className="px-2 text-right">{line.qty}</td>
                          <td className="px-2 text-right">{fmtAmount(line.unitPrice)}</td>
                          <td className="pl-2 text-right">{fmtAmount(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>

          <details className="fold panel">
            <summary>
              Every check{" "}
              <span className={`ml-auto font-medium ${failed.length ? "text-brick" : "text-ok"}`}>
                {checks.length - failed.length} of {checks.length} passed
              </span>
            </summary>
            <div className="px-5 pb-5 sm:px-6">
              <p className="mb-2 text-[0.9375rem] text-ink-3">Plain arithmetic and lookups, not AI. They run again as you correct a value.</p>
              <ul className="grid gap-2.5">
                {checks.map((check) => (
                  <li key={check.key} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
                    <Tick ok={check.ok} className={`mt-1 size-4 ${check.ok ? "text-ok" : "text-brick"}`} />
                    <div>
                      <p className="font-semibold leading-snug">
                        <span className="sr-only">{check.ok ? "Passed: " : "Failed: "}</span>
                        {check.label}
                      </p>
                      <p className={`text-[0.9375rem] leading-snug ${check.ok ? "text-ink-3" : "text-brick"}`}>{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <details className="fold panel">
            <summary>History</summary>
            <ol className="list-decimal px-5 pb-5 pl-10 text-[0.9375rem] leading-relaxed text-ink-2 sm:px-6 sm:pl-11">
              {doc.history.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

/** A box given as fractions of the page, as CSS, with a little room around the text. */
function place(box: Box): React.CSSProperties {
  const pad = 0.003;
  return { left: `${(box.x - pad) * 100}%`, top: `${(box.y - pad) * 100}%`, width: `${(box.w + pad * 2) * 100}%`, height: `${(box.h + pad * 2) * 100}%` };
}

/** On a small screen, the part of the page a value came from, enlarged right under the value with the spot ringed. */
function CloseUp({ boxes, page, label }: { boxes: Box[]; page: DocumentView["pages"][number]; label: string }) {
  const onPage = boxes.filter((box) => box.page === boxes[0].page);
  const left = Math.min(...onPage.map((box) => box.x));
  const right = Math.max(...onPage.map((box) => box.x + box.w));
  const top = Math.min(...onPage.map((box) => box.y));
  const bottom = Math.max(...onPage.map((box) => box.y + box.h));
  const zoom = Math.min(page.width < 1000 ? 1.6 : 2.2, 0.8 / Math.max(right - left, 0.05));
  // Keep the crop on the page: a value near the edge is shown off-centre, not with empty space beside it.
  const half = 0.5 / zoom;
  const cx = Math.min(1 - half, Math.max(half, (left + right) / 2));
  // Tall enough for the spot itself at a phone's width (about 330px for the crop), with room round it.
  const height = Math.round(Math.max(96, Math.min(260, (bottom - top) * (page.height / page.width) * zoom * 330 + 60)));
  return (
    <div className="relative mx-5 mb-4 overflow-hidden rounded-xl bg-white shadow-[inset_0_0_0_1px_var(--color-line)] sm:mx-6 lg:hidden" style={{ height }}>
      <div className="absolute left-1/2 top-1/2" style={{ width: `${zoom * 100}%`, aspectRatio: `${page.width} / ${page.height}`, transform: `translate(${-cx * 100}%, ${-((top + bottom) / 2) * 100}%)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a crop of the same sample scan */}
        <img src={page.src} alt={`Close-up of the page where ${label} was read`} className="block size-full" />
        {onPage.map((box, n) => (
          <span key={n} data-active="" className="source-box" style={place(box)} />
        ))}
      </div>
    </div>
  );
}
