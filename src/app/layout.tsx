import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PriorAuth Passport",
  description:
    "Real-time electronic prior authorization infrastructure for requirement discovery, evidence matching, payer submission, ROI, and audit proof."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
