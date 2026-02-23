// app/board/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type CardType = {
  id: string;
  title: string;
  listId: string;
};

const defaultLists = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function BoardDetail() {
  const { id } = useParams();
  const [board, setBoard] = useState<any>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const router = useRouter();

  // Load board info
  useEffect(() => {
    const loadBoard = async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Board not found");
        router.push("/dashboard");
        return;
      }
      setBoard(data);
      setLoading(false);
    };
    loadBoard();
  }, [id, router]);

  // Add new card
  const handleAddCard = () => {
    if (!newCardTitle.trim() || !selectedListId) {
      toast.error("Enter title and select list");
      return;
    }

    const newCard: CardType = {
      id: Date.now().toString(),
      title: newCardTitle,
      listId: selectedListId,
    };

    setCards([...cards, newCard]);
    setNewCardTitle("");
    setSelectedListId(null);
    toast.success("Card added!");
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
    toast.success("Card deleted");
  };

  // Move card to another list
  const handleMoveCard = (cardId: string, newListId: string) => {
    setCards(
      cards.map((c) =>
        c.id === cardId ? { ...c, listId: newListId } : c
      )
    );
    toast.success("Card moved!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading board...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{board?.title || "Board"}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {defaultLists.map((list) => (
          <Card key={list.id} className="bg-card">
            <CardHeader>
              <CardTitle>{list.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[300px]">
              {cards
                .filter((c) => c.listId === list.id)
                .map((card) => (
                  <div
                    key={card.id}
                    className="p-4 bg-muted rounded-md flex justify-between items-center"
                  >
                    <span>{card.title}</span>
                    <div className="flex gap-2">
                      <select
                        className="text-sm border rounded p-1"
                        value=""
                        onChange={(e) => handleMoveCard(card.id, e.target.value)}
                      >
                        <option value="">Move to...</option>
                        {defaultLists
                          .filter((l) => l.id !== list.id)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}

              <Dialog open={selectedListId === list.id} onOpenChange={(open) => !open && setSelectedListId(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setSelectedListId(list.id)}>
                    + Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Card to {list.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardTitle">Card Title</Label>
                      <Input
                        id="cardTitle"
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        placeholder="Task title"
                      />
                    </div>
                    <Button onClick={handleAddCard} disabled={!newCardTitle.trim()}>
                      Add Card
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}