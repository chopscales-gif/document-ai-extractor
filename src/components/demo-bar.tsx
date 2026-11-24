"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { resetDemoAction } from "@/server/actions";
import { startTour } from "./tour";

/**
 * One slim line across the top of every page. It is the only part of the
 * screen that belongs to the demo rather than to the fictional firm, so it
 * stays plain white and quiet.
 */
export function DemoBar({ canReset }: { canReset: boolean }) {
  const action = "link whitespace-nowrap text-[0.9375rem] text-ink";
  return (
    <div className="demo-chrome border-b border-line bg-panel text-[0.9375rem] text-ink-2">
      <div className="mx-auto flex max-w-[84rem] flex-wrap items-center gap-x-6 gap-y-1.5 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6">
        <a href="https://haydenhuelskamp.vercel.app/#bookkeeping" className={action}>
          ← All demos
        </a>
        <p className="min-w-0 flex-1 basis-[22rem] leading-snug">
          <strong className="font-bold text-ink">Demonstration build.</strong> Fictional firm and documents. The AI readings were recorded ahead of time; the checks run live.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" className={`${action} inline-flex min-h-11 cursor-pointer items-center sm:min-h-8`} onClick={startTour}>
            Take the tour
          </button>
          <Link href="/about" className={`${action} inline-flex min-h-11 items-center sm:min-h-8`}>
            How it works
          </Link>
          {canReset && (
            <form action={resetDemoAction}>
              <ResetButton className={action} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} inline-flex min-h-11 cursor-pointer items-center disabled:opacity-60 sm:min-h-8`}>
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
