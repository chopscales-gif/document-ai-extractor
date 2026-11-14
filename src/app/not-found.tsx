import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">That page is not here</h1>
      <p className="mt-3 leading-relaxed text-muted">If you followed a link to a document, it belonged to a copy of the demo that has since been reset. The inbox has the current ones.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Open the inbox
      </Link>
    </main>
  );
}
