import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Review } from "@/components/review";
import { KIND_LABEL } from "@/lib/samples";
import { documentView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Review a document" };

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const doc = await documentView(await getCtx(), id);
  if (!doc) notFound();

  return (
    <main className="mx-auto w-full max-w-[76rem] flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link href="/inbox" className="inline-flex min-h-11 items-center font-semibold text-ink-2 hover:text-ink">
        ← Inbox
      </Link>
      <h1 className="mt-1 text-[clamp(2rem,3.8vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.03em]">{doc.title}</h1>
      <p className="mt-2 text-lg text-ink-2">
        {KIND_LABEL[doc.kind]} for {doc.sample.client}. {doc.sample.source}, {doc.sample.received}.{doc.sample.pages > 1 ? ` ${doc.sample.pages} pages.` : ""}
      </p>
      {/* A fresh copy of the screen's state whenever the document's saved state changes underneath it. */}
      <Review key={`${doc.id}-${doc.status}-${JSON.stringify(doc.values)}`} doc={doc} />
    </main>
  );
}
