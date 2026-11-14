"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { resetDemoAction } from "@/server/actions";

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo rather than to the fictional firm's product.
 */
export function DemoBar({ canReset }: { canReset: boolean }) {
  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <p className="min-w-0 flex-1 basis-64 leading-snug">
          <strong className="font-semibold">Demonstration build.</strong>{" "}
          <span className="text-white/75">A fictional bookkeeping firm with invented clients and documents. The AI readings were recorded ahead of time. Nothing is sent.</span>
        </p>
        <Link href="/about" className="font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white">
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
    <button type="submit" disabled={pending} className="cursor-pointer rounded border border-white/30 px-3 py-1.5 font-semibold hover:border-white disabled:opacity-60">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
