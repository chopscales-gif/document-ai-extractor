import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How this demo works" };

export default function AboutPage() {
  const h2 = "mt-8 border-t border-rule pt-5 font-display text-2xl font-bold tracking-tight";
  const p = "mt-2 leading-relaxed";
  return (
    <main className="mx-auto w-full max-w-[48rem] flex-1 px-4 py-8 sm:px-6 lg:py-10">
      <div className="sheet px-5 py-7 sm:px-10 sm:py-9">
        <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-tight">How this demo works</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          This is a demonstration build by ChopMedia. The bookkeeping firm, its clients, the vendors and every document are invented. It is not client work.
        </p>

        <h2 className={h2}>What is recorded</h2>
        <p className={p}>
          The AI reading. Each sample page was shown, as a picture, to Claude, an AI model made by Anthropic, and what it read was saved: the values, and the notes where it was not sure how to treat something. The demo replays those saved readings. It does not call an AI model while you use it, which is why it is free to run and why you cannot upload your own documents here.
        </p>
        <p className={p}>
          The readings were not tidied up afterwards. There are no confidence percentages, because the model did not give any, and none were made up.
        </p>
        <p className={p}>
          The highlight that shows where a value came from uses word positions saved when the sample pages were made. In a real build those positions come from the text-recognition step that runs on each incoming page.
        </p>

        <h2 className={h2}>What is real</h2>
        <p className={p}>
          Everything after the reading. The checks are ordinary arithmetic and lookups that run on the values as they stand, and run again when you correct one. Approving, rejecting with a reason, reopening, adding a vendor to a client&apos;s file, the history on each document and the spreadsheet on the Export page all work, on your own private copy of the sample data. Reset demo in the bar at the top puts it back.
        </p>

        <h2 className={h2}>What a real build adds</h2>
        <ul className="mt-2 grid list-disc gap-1.5 pl-5 leading-relaxed">
          <li>A way in for your documents: a shared mailbox, a scanner folder, or a client upload page.</li>
          <li>A live AI reading of each page as it arrives, set up and tested on your own kinds of documents.</li>
          <li>A connection to your accounting system, so an approved bill is posted and not retyped.</li>
          <li>Sign-in for your staff, and your own rules for what must be seen by a person.</li>
        </ul>
        <p className={p}>
          The honest weak point of any tool like this is that it only matters how it does on your documents, not on samples. The way to find out is to run a batch of your real ones through it together.
        </p>

        <Link href="/" className="btn btn-primary mt-8">
          Open the inbox
        </Link>
      </div>
    </main>
  );
}
