import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { SiteHeader } from "@/components/site";
import { sandboxIdOrNull } from "@/server/session";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexCondensed = IBM_Plex_Sans_Condensed({ variable: "--font-plex-condensed", subsets: ["latin"], weight: ["600"] });

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
    <html lang="en" className={`${plex.variable} ${plexCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar canReset={hasSandbox} />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
