import Image from "next/image";
import Link from "next/link";
import { TourButton } from "@/components/tour";
import { foundBy } from "@/lib/flag";
import { inbox } from "@/server/queries";
import { getCtx } from "@/server/session";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const say = (n: number) => WORDS[n] ?? String(n);

/** The first thing a visitor sees: what the tool is for, in one line, and today's numbers from their own copy of the inbox. */
export default async function WelcomePage() {
  const rows = await inbox(await getCtx());
  const waiting = rows.filter((row) => row.status === "needs_review");
  const held = waiting.filter((row) => !row.assessment.clean);
  const approved = rows.filter((row) => row.status === "approved");
  // The catch to show off: the first document still waiting whose check found an amount that is off, or failing that, any catch with a figure.
  const catches = held.flatMap((row) => row.assessment.failed.filter((check) => check.figure).map((check) => ({ row, check })));
  const caught = catches.find(({ check }) => check.figure!.startsWith("$")) ?? catches[0];

  const float = "panel-lg absolute bg-white/95 px-5 py-4 text-left max-sm:relative max-sm:inset-auto max-sm:w-auto";
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-[76rem] px-4 pt-10 text-center sm:px-6 sm:pt-14">
        <h1 className="mx-auto max-w-[15ch] text-[clamp(2.5rem,6.2vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
          Every bill read, <em className="font-medium text-plum">every sum</em> checked.
        </h1>
        <p className="mx-auto mb-8 mt-6 max-w-[36em] text-lg text-ink-2 sm:text-xl">
          Invoices, receipts and W-9s from your clients are read by AI, then checked by plain arithmetic. Anything that does not add up waits for a person.
        </p>
        <Link href="/inbox" className="btn btn-primary">
          Open the inbox →
        </Link>

        <div className="relative mt-12 sm:mt-14">
          <div className="relative aspect-[16/8.2] overflow-hidden rounded-[2rem] bg-wash shadow-[var(--shadow-lg)] max-sm:aspect-[4/3.4] max-sm:rounded-3xl">
            <Image src="/photos/hero-tax-forms.jpg" alt="Two people going through tax forms on a grey table" fill priority sizes="(min-width: 1216px) 1168px, 100vw" className="object-cover object-[50%_60%] brightness-[1.12] saturate-[0.85]" />
          </div>
          <div className="max-sm:-mt-10 max-sm:grid max-sm:gap-3 max-sm:px-3">
            <div className={`${float} -left-7 top-[12%] w-64 max-lg:left-3`}>
              <p className="text-[0.9375rem] leading-snug text-ink-2">Came in this week</p>
              <p className="mt-1.5 text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{rows.length}</p>
              <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-2">invoices, receipts and W-9s</p>
            </div>
            <div className={`${float} -right-7 top-[9%] w-60 max-lg:right-3`}>
              <p className="text-[0.9375rem] leading-snug text-ink-2">{waiting.length ? "Held for a person" : "Approved"}</p>
              <p className="mt-1.5 text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{waiting.length ? held.length : approved.length}</p>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-wash">
                <i className="block h-full rounded-full bg-gradient-to-r from-mauve to-plum" style={{ width: `${Math.round(((waiting.length ? held.length : approved.length) / Math.max(rows.length, 1)) * 100)}%` }} />
              </div>
            </div>
            {caught ? (
              <Link href={`/documents/${caught.row.id}`} className={`${float} -bottom-10 right-[6%] w-[21rem] transition-transform hover:-translate-y-0.5`}>
                <p className="text-[0.9375rem] font-semibold leading-snug">{caught.row.title}</p>
                <p className="mt-1.5 text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] text-brick tabular-nums">{caught.check.figure}</p>
                <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2">{caught.check.problem}.</p>
                <p className="mt-1.5 text-sm leading-snug text-ink-3">{foundBy(caught.check).replace("Found", "Caught")}</p>
              </Link>
            ) : (
              <div className={`${float} -bottom-10 right-[6%] w-[21rem]`}>
                <p className="text-[0.9375rem] leading-snug text-ink-2">Failed checks still waiting</p>
                <p className="mt-1.5 text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] text-ok">None</p>
                <p className="mt-2 text-sm leading-snug text-ink-2">Reset demo at the top puts all {rows.length} documents back.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <div aria-hidden className="mb-4 mt-20 flex justify-center gap-2.5 sm:mt-28 sm:gap-5">
          {[
            ["desk-Ym_TFojbQ8", "-rotate-[4deg] translate-y-2.5"],
            ["desk-UOalOTfpzlE", "rotate-[2.5deg]"],
            ["desk-jsx4qvopjG4", "-rotate-2 translate-y-3.5"],
            ["desk-xcvXS6wDCAY", "rotate-[3.5deg]"],
          ].map(([name, turn]) => (
            <figure key={name} className={`relative m-0 aspect-[4/5] w-[23%] overflow-hidden rounded-2xl bg-wash shadow-[var(--shadow-lg)] sm:rounded-[1.375rem] ${turn}`}>
              <Image src={`/photos/${name}.jpg`} alt="" fill sizes="(min-width: 1216px) 270px, 23vw" className="object-cover" />
            </figure>
          ))}
        </div>
        <h2 className="mx-auto mt-14 max-w-[22ch] text-center text-[clamp(1.625rem,3vw,2.375rem)] font-extrabold leading-[1.12] tracking-[-0.025em] sm:mt-16">
          {held.length
            ? `Your people check the ${say(held.length)} that need${held.length === 1 ? "s" : ""} them, not all ${say(rows.length)}.`
            : waiting.length
              ? `Nothing needs a person. ${say(waiting.length).replace(/^./, (c) => c.toUpperCase())} ${waiting.length === 1 ? "is" : "are"} ready to approve.`
              : "Every document has been decided."}
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-[34em] text-center text-lg text-ink-2">
          Each value shows where on the page it came from. The clean documents are approved together and go to the books in one export.
        </p>
        <div className="text-center">
          <TourButton className="btn btn-quiet">Take the two-minute tour</TourButton>
        </div>
      </section>

      <footer className="mx-auto mt-24 w-full max-w-[76rem] border-t border-line px-4 pb-10 pt-7 text-[0.9375rem] text-ink-3 sm:px-6">
        Wren &amp; Abacus Bookkeeping, its clients and their documents are invented for this demonstration. The photos are stock photos from Unsplash; the people in them are not staff or clients.
      </footer>
    </main>
  );
}
