"use client";  // ← Needed for client-side interactivity like toasts

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";  // ← Import from sonner

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-8 gap-12">
      <h1 className="text-5xl font-bold tracking-tight">Collab Task App</h1>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Your Kanban Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Real-time collaborative tasks built with Next.js 15 + shadcn/ui + Supabase
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              toast.success("Board ready!", {
                description: "Let's start building your first board.",
                action: {
                  label: "Create Board",
                  onClick: () => console.log("Create clicked"),
                },
              })
            }
          >
            Test Toast + Get Started
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}