import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { SiteHeader } from "@/components/site";
import { Tour } from "@/components/tour";
import { sandboxIdOrNull } from "@/server/session";
import "./globals.css";

// A soft, round sans with a heavy weight for headlines and a true italic for the one phrase that leans.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Document AI extractor (demo)", template: "%s | Document AI extractor (demo)" },
  description:
    "A demonstration build by ChopMedia: invoices, receipts and W-9s read by AI, checked by arithmetic, and reviewed by a person before anything reaches the books. Fictional firm, sample documents.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf8f6" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const hasSandbox = (await sandboxIdOrNull()) !== null;
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar canReset={hasSandbox} />
        <SiteHeader />
        {children}
        <Tour />
      </body>
    </html>
  );
}
