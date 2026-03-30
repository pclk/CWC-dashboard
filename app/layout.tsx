import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cadet Wing Commander Dashboard",
  description: "Internal operations dashboard for cadet wing commander workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
