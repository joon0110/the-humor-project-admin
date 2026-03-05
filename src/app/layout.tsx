import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Humor Project Admin",
  description: "Admin dashboard for The Humor Project."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
