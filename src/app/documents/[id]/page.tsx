import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Review } from "@/components/review";
import { StatusChip } from "@/components/ui";
import { KIND_LABEL } from "@/lib/samples";
import { documentView } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Review a document" };

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const doc = await documentView(await getCtx(), id);
  if (!doc) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
        Back to the inbox
      </Link>
      <div className="mb-5 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{doc.title}</h1>
        <StatusChip status={doc.status} clean={doc.assessment.clean} />
        <p className="w-full leading-snug text-muted">
          {KIND_LABEL[doc.kind]} for {doc.sample.client}. {doc.sample.source}, {doc.sample.received}. {doc.sample.pages === 1 ? "One page." : `${doc.sample.pages} pages.`}
        </p>
      </div>
      {/* A fresh copy of the screen's state whenever the document's saved state changes underneath it. */}
      <Review key={`${doc.id}-${doc.status}-${JSON.stringify(doc.values)}`} doc={doc} />
    </main>
  );
}
