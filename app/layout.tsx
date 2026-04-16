import type { Metadata } from "next";
import { inter, interDisplay } from "@/app/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "BioTransport Anemia Screening",
  description: "AI-powered anemia risk screening using a simple eye photo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${interDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
