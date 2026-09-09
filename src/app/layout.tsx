import type { Metadata } from "next";
import { helveticaNow, helveticaNowCondensed } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morgan - Portfolio Summary",
  description: "Asset & development tracker for Morgan Real Estate.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${helveticaNow.variable} ${helveticaNowCondensed.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
