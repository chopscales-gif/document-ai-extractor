"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FIRM } from "@/lib/samples";

/** The fictional firm's own header: its name, and the two places work happens. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`border-b-2 px-1 py-3 font-semibold ${active ? "border-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 px-4 sm:px-6">
        <p className="py-3 font-display text-xl font-semibold tracking-tight">
          {FIRM.name} <span className="font-sans text-sm font-normal text-muted">{FIRM.town}</span>
        </p>
        <nav aria-label="Main" className="flex gap-6">
          {tab("/", "Inbox", pathname === "/" || pathname.startsWith("/documents"))}
          {tab("/export", "Export", pathname.startsWith("/export"))}
        </nav>
      </div>
    </header>
  );
}
