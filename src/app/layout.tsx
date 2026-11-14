import type { Metadata, Viewport } from "next";
import { Besley, Libre_Franklin } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { SiteHeader } from "@/components/site";
import { sandboxIdOrNull } from "@/server/session";
import "./globals.css";

// Besley is a Clarendon, the face on ledger spines and receipt books. Libre Franklin is the gothic of printed business forms.
const besley = Besley({ variable: "--font-besley", subsets: ["latin"], weight: ["500", "700"] });
const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Document AI extractor (demo)", template: "%s | Document AI extractor (demo)" },
  description:
    "A demonstration build by ChopMedia: invoices, receipts and W-9s read by AI, checked by arithmetic, and reviewed by a person before anything reaches the books. Fictional firm, sample documents.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const hasSandbox = (await sandboxIdOrNull()) !== null;
  return (
    <html lang="en" className={`${besley.variable} ${franklin.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar canReset={hasSandbox} />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
