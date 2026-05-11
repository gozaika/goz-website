import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
