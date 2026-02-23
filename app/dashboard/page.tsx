// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const covers = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
  "https://images.unsplash.com/photo-1557683304-673a23048d34?w=800",
  "https://images.unsplash.com/photo-1557683311-973673baf8f4?w=800",
  "https://images.unsplash.com/photo-1557682250-33bd7092b7c0?w=800",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUser(user);

      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) toast.error("Failed to load boards: " + error.message);
      else setBoards(data || []);
      setLoading(false);
    };
    loadData();
  }, [router]);

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return toast.error("Enter board title");

    const randomCover = covers[Math.floor(Math.random() * covers.length)];

    const { data, error } = await supabase
      .from("boards")
      .insert({
        title: newBoardTitle,
        user_id: user.id,
        cover_url: randomCover,
      })
      .select();

    if (error) toast.error(error.message);
    else {
      setBoards([data[0], ...boards]);
      setNewBoardTitle("");
      setDialogOpen(false);
      toast.success("Board created!");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">
          Welcome, {user?.email?.split('@')[0] || "User"}!
        </h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ New Board</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Board Title</Label>
                <Input
                  id="title"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="My Project"
                />
              </div>
              <Button onClick={handleCreateBoard} disabled={!newBoardTitle.trim()}>
                Create Board
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {boards.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No boards yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link href={`/board/${board.id}`} key={board.id}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                <div
                  className="h-32 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${board.cover_url})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardHeader className="pb-3 relative z-10 -mt-10">
                  <CardTitle className="text-white drop-shadow-md">{board.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created{" "}
                    {board.created_at
                      ? new Date(board.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Just now"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}