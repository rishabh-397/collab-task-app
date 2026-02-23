// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 gap-12 bg-background">
      <h1 className="text-5xl font-bold tracking-tight text-center">
        Collab Task App
      </h1>

      <p className="text-xl text-muted-foreground text-center max-w-md">
        Real-time collaborative task board & project management
      </p>

      <Link href="/login">
        <Button size="lg" className="px-8 py-6 text-lg">
          Get Started – Login / Sign Up
        </Button>
      </Link>
    </main>
  );
}