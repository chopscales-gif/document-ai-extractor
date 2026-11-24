import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.03em]">That page is not here</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">If you followed a link to a document, it belonged to a copy of the demo that has since been reset. The inbox has the current ones.</p>
      <Link href="/inbox" className="btn btn-primary mt-7">
        Open the inbox
      </Link>
    </main>
  );
}
