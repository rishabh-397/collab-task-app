// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

import ThemeSwitcher from "@/components/ThemeSwitcher";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collab Task App",
  description: "Real-time collaborative Kanban board with Next.js & Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex justify-end items-center p-4 gap-6 bg-background border-b sticky top-0 z-50">
            <ThemeSwitcher />
          </header>

          <main className="min-h-[calc(100vh-64px)]">{children}</main>

          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}