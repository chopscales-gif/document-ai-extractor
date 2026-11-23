"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { resetDemoAction } from "@/server/actions";

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo rather than to the fictional firm's product, so it
 * is the one thing made of manila rather than of the account book.
 */
export function DemoBar({ canReset }: { canReset: boolean }) {
  return (
    <div className="demo-chrome bg-manila text-sm text-ink">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 sm:px-6">
        <p className="min-w-0 flex-1 basis-64 text-pretty py-1 leading-snug">
          <a href="https://chopmedia.vercel.app/#bookkeeping" className="mr-3 whitespace-nowrap font-semibold underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            ← All demos
          </a>{" "}
          <strong className="font-bold">Demonstration build.</strong>{" "}
          <span>A fictional bookkeeping firm with invented clients and documents. The AI readings were recorded ahead of time. Nothing is sent.</span>
        </p>
        <Link href="/about" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/40 underline-offset-4 hover:decoration-ink sm:min-h-9">
          How this demo works
        </Link>
        {canReset && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
      </div>
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-11 cursor-pointer rounded-[3px] border-[1.5px] border-ink/50 px-3 font-semibold hover:border-ink hover:bg-manila-soft disabled:opacity-60 sm:min-h-9">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
