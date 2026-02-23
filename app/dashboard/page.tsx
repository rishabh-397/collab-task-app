// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";  // ← Make sure this import is here
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

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

      if (error) toast.error("Failed to load boards");
      else setBoards(data || []);
      setLoading(false);
    };
    loadData();
  }, [router]);

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return toast.error("Enter board title");

    setLoading(true);
    const { data, error } = await supabase
      .from("boards")
      .insert({ title: newBoardTitle, user_id: user.id })
      .select();

    setLoading(false);
    if (error) toast.error(error.message);
    else {
      setBoards([data[0], ...boards]);
      setNewBoardTitle("");
      setDialogOpen(false);
      toast.success("Board created!");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
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
              <Button onClick={handleCreateBoard} disabled={loading || !newBoardTitle.trim()}>
                {loading ? "Creating..." : "Create Board"}
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
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{board.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(board.created_at).toLocaleDateString()}
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