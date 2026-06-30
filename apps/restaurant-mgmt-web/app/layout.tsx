import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "goZaika Partner",
    template: "%s · goZaika Partner",
  },
  description: "goZaika Partner portal — manage BAM Bag drops, orders, finance, and your restaurant profile.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
