import type { Metadata } from "next";
import { Instrument_Sans, Noto_Naskh_Arabic } from "next/font/google";

import { getSiteUrl } from "@/lib/env";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Levantine corpus",
  description: "Levantine Arabic corpus for study and retrieval",
  metadataBase: new URL(getSiteUrl()),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${notoNaskh.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
