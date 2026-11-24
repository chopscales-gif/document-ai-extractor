import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How this demo works" };

export default function AboutPage() {
  const h2 = "mt-10 text-2xl font-extrabold tracking-[-0.02em]";
  const p = "mt-3 text-lg leading-relaxed text-ink-2";
  return (
    <main className="mx-auto w-full max-w-[46rem] flex-1 px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-[clamp(2.25rem,4.6vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">How this demo works</h1>
      <p className="mt-5 text-xl leading-relaxed">
        This is a demonstration build by ChopMedia, not client work. Wren &amp; Abacus Bookkeeping, its clients, the vendors and every document are invented.
      </p>

      <h2 className={h2}>What is recorded</h2>
      <p className={p}>
        The AI reading. Each sample page was shown, as a picture, to Claude, an AI model made by Anthropic, and what it read was saved, mistakes and notes included. The demo replays those readings and never calls an AI model while you use it, which is why you cannot upload your own documents here.
      </p>
      <p className={p}>There are no confidence percentages, because the model did not give any, and none were made up.</p>

      <h2 className={h2}>What is real</h2>
      <p className={p}>
        Everything after the reading. The checks are plain arithmetic and lookups, and they run again when you correct a value. Approving, holding for the client, reopening, adding a vendor, the history and the spreadsheet all work, on your own private copy of the sample data. Reset demo at the top puts it back.
      </p>

      <h2 className={h2}>What a real build adds</h2>
      <ul className="mt-3 grid list-disc gap-2 pl-6 text-lg leading-relaxed text-ink-2">
        <li>A way in for your documents: a shared mailbox, a scanner folder, or a client upload page.</li>
        <li>A live AI reading of each page as it arrives, tested on your own kinds of documents.</li>
        <li>A connection to your accounting system, so an approved bill is posted, not retyped.</li>
        <li>Sign-in for your staff, and your own rules for what a person must see.</li>
      </ul>
      <p className={p}>It only matters how a tool like this does on your documents, not on samples. The way to find out is to run a batch of your real ones through it together.</p>

      <Link href="/inbox" className="btn btn-primary mt-10">
        Open the inbox
      </Link>
    </main>
  );
}
