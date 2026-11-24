"use client";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.03em]">This page did not load</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        Try again. If it keeps happening, use Reset demo at the top to start from a fresh copy of the sample data. This demo needs cookies turned on to keep your copy separate from other visitors.
      </p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-7">
        Try again
      </button>
    </main>
  );
}
