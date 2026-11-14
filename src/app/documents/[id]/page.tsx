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
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-8 pt-3 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-0.5">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-desk-text underline decoration-desk-line underline-offset-4 hover:text-paper hover:decoration-paper">
          Back to the inbox
        </Link>
        <h1 className="font-display text-[1.75rem] font-medium leading-tight tracking-tight text-paper">{doc.title}</h1>
        <StatusChip status={doc.status} clean={doc.assessment.clean} />
        <p className="w-full leading-snug text-desk-text">
          {KIND_LABEL[doc.kind]} for {doc.sample.client}. {doc.sample.source}, {doc.sample.received}. {doc.sample.pages === 1 ? "One page." : `${doc.sample.pages} pages.`}
        </p>
      </div>
      {/* A fresh copy of the screen's state whenever the document's saved state changes underneath it. */}
      <Review key={`${doc.id}-${doc.status}-${JSON.stringify(doc.values)}`} doc={doc} />
    </main>
  );
}
