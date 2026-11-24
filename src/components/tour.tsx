"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * A short guided tour: everything but one thing is dimmed, with a sentence
 * beside it, and the visitor moves on when ready. It walks from the inbox
 * into the plumber's invoice, so it remembers its step across pages.
 */

const STEP = "tour-step";
const DOC = "tour-doc";

type Step = { path: () => string | null; find: () => HTMLElement | null; say: string; before?: () => void };

const narrow = () => window.matchMedia("(max-width: 1023px)").matches;
const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const read = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {}
};

const STEPS: Step[] = [
  {
    path: () => "/inbox",
    find: () => {
      const row = $('[data-doc-key="plumbing-invoice"]');
      // If it has already been decided it sits in a folded list: open it.
      const fold = row?.closest("details");
      if (fold && !fold.open) fold.open = true;
      return row;
    },
    say: "Each document that needs a person says why, in one line. This plumber's invoice is one: its lines do not add up.",
  },
  {
    path: () => read(DOC),
    find: () => $('[data-tour="flag"]'),
    say: "The check that failed, in one sentence and one figure. Plain arithmetic found it, not the AI.",
  },
  {
    path: () => read(DOC),
    before: () => window.dispatchEvent(new CustomEvent("review:pick", { detail: "subtotal" })),
    find: () => $('[data-value="subtotal"]'),
    say: "Every value the AI read can be found on the page. This is the subtotal it read.",
  },
  {
    path: () => read(DOC),
    find: () => (narrow() ? ($('[data-value="subtotal"]')?.parentElement ?? null) : $('[data-tour="sheet"]')),
    say: "The highlight sits on the exact words it was read from, so nobody has to hunt for it.",
  },
  {
    path: () => read(DOC),
    find: () => $('[data-tour="decide"]'),
    say: "Hold it for the client, or approve it with a note saying why. The documents that passed everything are approved together from the inbox.",
  },
];

/** Starts the tour from the first step, from any page. */
export function startTour() {
  write(STEP, "0");
  window.dispatchEvent(new Event("tour:start"));
}

export function TourButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={startTour}>
      {children}
    </button>
  );
}

type Spot = { left: number; top: number; width: number; height: number; at: string };

export function Tour() {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    const sync = () => {
      const saved = read(STEP);
      setStep(saved === null ? null : Number(saved));
    };
    sync();
    window.addEventListener("tour:start", sync);
    return () => window.removeEventListener("tour:start", sync);
  }, []);

  const end = useCallback(() => {
    write(STEP, null);
    setStep(null);
    setTarget(null);
    setSpot(null);
  }, []);

  // Go to the step's page, wait for its element, bring it into view, then light it.
  useEffect(() => {
    if (step === null) return;
    const current = STEPS[step];
    const want = current?.path();
    if (!current || !want) {
      const later = window.setTimeout(end);
      return () => window.clearTimeout(later);
    }
    if (pathname !== want) {
      router.push(want);
      return;
    }
    let tries = 0;
    let settle: number | undefined;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const poll = window.setInterval(() => {
      const element = current.find();
      if (!element || !element.getBoundingClientRect().height) {
        if (++tries > 40) {
          window.clearInterval(poll);
          end();
        }
        return;
      }
      window.clearInterval(poll);
      if (step === 0) write(DOC, element.getAttribute("href"));
      current.before?.();
      settle = window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const room = Math.min(rect.height, window.innerHeight * 0.55);
        const top = window.scrollY + rect.top - Math.max(96, (window.innerHeight - room) / 2 - 90);
        window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
        setTarget(element);
      }, 150);
    }, 100);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(settle);
    };
  }, [step, pathname, router, end]);

  // Keep the light on the element as the page scrolls or resizes.
  useEffect(() => {
    if (!target || step === null) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        setSpot({ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, at: window.location.pathname });
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [target, step]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && end();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, end]);

  if (step === null || !spot || spot.at !== pathname || !target?.isConnected) return null;
  const last = step === STEPS.length - 1;
  const next = () => {
    if (last) return end();
    setTarget(null);
    write(STEP, String(step + 1));
    setStep(step + 1);
  };

  // The caption goes under the lit element, or above it, or at the foot of the screen when the element is tall.
  const tipHeight = 190;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  let tipTop = spot.top + spot.height + 14;
  if (tipTop + tipHeight > vh - 16) tipTop = spot.top - tipHeight - 14;
  if (tipTop < 16 || spot.height > vh * 0.6) tipTop = vh - tipHeight - 20;
  const tipLeft = Math.min(Math.max(16, spot.left), vw - Math.min(380, vw - 32) - 16);

  return (
    <>
      <div aria-hidden className="tour-spot" style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }} />
      <div role="dialog" aria-label="Tour" className="tour-tip panel-lg px-5 py-5 sm:px-6" style={{ top: tipTop, left: tipLeft }}>
        <p className="text-sm text-ink-3">
          Step {step + 1} of {STEPS.length}
        </p>
        <p className="mt-1.5 text-[1.0625rem] leading-snug">{STEPS[step].say}</p>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="btn btn-primary min-h-11 px-5 py-2.5 text-[0.9375rem]" onClick={next} autoFocus>
            {last ? "Finish" : "Next"}
          </button>
          <button type="button" className="ml-auto inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-2 hover:text-ink" onClick={end}>
            End tour
          </button>
        </div>
      </div>
    </>
  );
}
