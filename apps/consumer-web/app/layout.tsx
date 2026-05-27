import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ConsumerFooter } from "./footer";

export const metadata: Metadata = {
  title: "goZaika | BAM Bag Discovery",
  description: "Great food. No menu. No algorithm. Claim chef-curated BAM Bags in Hyderabad.",
  icons: {
    icon: "/brand/hero-bam-bag.svg",
    apple: "/brand/hero-bam-bag.svg",
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#1A5C38] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {children}
        <ConsumerFooter />
      </body>
    </html>
  );
}
