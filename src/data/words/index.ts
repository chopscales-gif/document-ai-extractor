import type { PageWords } from "@/lib/locate";
import w0 from "./concrete-invoice.json";
import w1 from "./hardware-receipt.json";
import w2 from "./lab-invoice.json";
import w3 from "./linen-invoice.json";
import w4 from "./linen-invoice-copy.json";
import w5 from "./lumber-invoice.json";
import w6 from "./lunch-receipt.json";
import w7 from "./plumbing-invoice.json";
import w8 from "./produce-invoice.json";
import w9 from "./w9-farrow.json";
import w10 from "./w9-ironwood.json";
import w11 from "./w9-kestrel.json";

/** Word positions on every sample page, saved by scripts/make-samples.mjs when the pages were drawn. */
export const WORDS = {
  "concrete-invoice": w0,
  "hardware-receipt": w1,
  "lab-invoice": w2,
  "linen-invoice": w3,
  "linen-invoice-copy": w4,
  "lumber-invoice": w5,
  "lunch-receipt": w6,
  "plumbing-invoice": w7,
  "produce-invoice": w8,
  "w9-farrow": w9,
  "w9-ironwood": w10,
  "w9-kestrel": w11,
} as unknown as Record<string, { pages: PageWords[] }>;
