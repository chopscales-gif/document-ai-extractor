"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FIRM } from "@/lib/samples";

/** The fictional firm's own header: its mark and name, which go back to the welcome page, and the two places work happens. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold sm:px-5 ${active ? "bg-panel text-ink shadow-[var(--shadow)]" : "text-ink-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-[env(safe-area-inset-top)] z-20 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[76rem] items-center gap-4 py-3.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${FIRM.name}, welcome page`}>
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-gradient-to-br from-plum to-plum-deep text-[1.0625rem] font-extrabold text-white shadow-[0_6px_14px_-6px_rgb(110_57_103/0.7)]">
            W
          </span>
          <span className="truncate text-[1.0625rem] font-bold tracking-[-0.01em] sm:text-lg">Wren &amp; Abacus</span>
          <span className="hidden truncate text-[0.9375rem] text-ink-3 md:inline">Bookkeeping, {FIRM.town}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex shrink-0 gap-1">
          {tab("/inbox", "Inbox", pathname.startsWith("/inbox") || pathname.startsWith("/documents"))}
          {tab("/export", "Export", pathname.startsWith("/export"))}
        </nav>
      </div>
    </header>
  );
}
