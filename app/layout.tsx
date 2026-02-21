import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";  // ← Add this import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collab Task App",
  description: "Real-time collaborative Kanban board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>  {/* suppressHydrationWarning for dark mode later */}
      <body className={inter.className}>
        {children}
        <Toaster />  {/* ← Add this line (place it at the end of body) */}
      </body>
    </html>
  );
}