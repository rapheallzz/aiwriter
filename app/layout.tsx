import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Writer",
  description: "Document editor with AI completions, real-time collaboration, and version history."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
