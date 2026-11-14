"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FIRM } from "@/lib/samples";

/** The fictional firm's own header: its name, lettered as on the cover of an account book, and the two places work happens as index tabs. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-t-md px-5 font-semibold ${active ? "bg-paper text-ink" : "bg-manila/20 text-paper hover:bg-manila/35"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b-4 border-paper bg-desk-deep">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-end justify-between gap-x-8 gap-y-2 px-4 pt-3 sm:px-6">
        <p className="pb-3 font-display text-[1.375rem] font-bold leading-tight tracking-tight text-paper">
          {FIRM.name} <span className="whitespace-nowrap font-sans text-sm font-normal tracking-normal text-desk-text">{FIRM.town}</span>
        </p>
        <nav aria-label="Main" className="flex gap-1.5">
          {tab("/", "Inbox", pathname === "/" || pathname.startsWith("/documents"))}
          {tab("/export", "Export", pathname.startsWith("/export"))}
        </nav>
      </div>
    </header>
  );
}
