import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "E-Commerce Agent",
  description: "AI-powered product discovery and monitoring dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
