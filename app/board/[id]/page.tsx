// app/board/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Tag, Clock, Edit } from "lucide-react";
import { toast } from "sonner";
import SortableCard from "@/components/SortableCard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LabelColor = "green" | "red" | "blue" | "yellow" | "purple";

type CommentType = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

type CardType = {
  id: string;
  title: string;
  list_id: string;
  position: number;
  labels?: LabelColor[];
  due_date?: string | null;
  comments?: CommentType[];
  created_at: string;
};

const defaultLists = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const labelColors: Record<LabelColor, string> = {
  green: "bg-green-500/20 text-green-700 border-green-500/30",
  red: "bg-red-500/20 text-red-700 border-red-500/30",
  blue: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  yellow: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  purple: "bg-purple-500/20 text-purple-700 border-purple-500/30",
};

const unsplashCovers = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
  "https://images.unsplash.com/photo-1557683304-673a23048d34?w=800",
  "https://images.unsplash.com/photo-1557683311-973673baf8f4?w=800",
  "https://images.unsplash.com/photo-1557682250-33bd7092b7c0?w=800",
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
];

export default function BoardDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [board, setBoard] = useState<any>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [newLabel, setNewLabel] = useState<LabelColor | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: boardData, error: boardError } = await supabase
          .from("boards")
          .select("*")
          .eq("id", id)
          .single();

        if (boardError || !boardData) {
          toast.error("Board not found");
          router.push("/dashboard");
          return;
        }

        setBoard(boardData);
        setRenameTitle(boardData.title);

        const { data: cardData, error: cardError } = await supabase
          .from("cards")
          .select("*, comments(*)")
          .eq("board_id", id)
          .order("position", { ascending: true });

        if (cardError) {
          toast.error("Failed to load cards: " + cardError.message);
        } else {
          setCards(cardData || []);
        }

        setLoading(false);
      } catch (err) {
        toast.error("Unexpected error loading board");
        setLoading(false);
      }
    };

    loadData();

  // Real-time subscription
const channel = supabase
  .channel(`cards:board=${id}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${id}` },
    (payload) => {
      if (payload.eventType === "INSERT") {
        setCards((prev) => [...prev, payload.new as CardType]);
      } else if (payload.eventType === "UPDATE") {
        setCards((prev) =>
          prev.map((c) =>
            c.id === payload.new.id ? { ...c, ...(payload.new as CardType) } : c
          )
        );
      } else if (payload.eventType === "DELETE") {
        setCards((prev) => prev.filter((c) => c.id !== payload.old.id));
      }
    }
  )
  .subscribe();



    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    const activeListId = activeCard.list_id;
    let newListId = activeListId;
    let newPosition = activeCard.position || 0;

    if (defaultLists.some((l) => l.id === over.id)) {
      newListId = over.id as string;
    } else {
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) {
        newListId = overCard.list_id;
        newPosition = overCard.position || 0;
        if (activeCard.position > newPosition) newPosition += 1;
      }
    }

    // Optimistic update
    setCards((prev) => {
      const updated = prev.map((c) =>
        c.id === active.id ? { ...c, list_id: newListId, position: newPosition } : c
      );

      const listCards = updated.filter((c) => c.list_id === newListId);
      const sorted = listCards.sort((a, b) => (a.position || 0) - (b.position || 0));
      const rePositioned = sorted.map((c, idx) => ({ ...c, position: idx }));

      return updated.map((c) =>
        c.list_id === newListId ? rePositioned.find((rc) => rc.id === c.id) || c : c
      );
    });

    // Save to DB
    const { error } = await supabase
      .from("cards")
      .update({ list_id: newListId, position: newPosition })
      .eq("id", active.id);

    if (error) toast.error("Failed to move card");
    else toast.success("Card moved!");
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || !selectedListId) {
      toast.error("Enter title and select list");
      return;
    }

    const maxPos = cards
      .filter((c) => c.list_id === selectedListId)
      .reduce((max, c) => Math.max(max, c.position || 0), 0);

    const newCard = {
      board_id: id,
      list_id: selectedListId,
      title: newCardTitle,
      position: maxPos + 1,
      due_date: newDueDate ? newDueDate.toISOString() : null,
      labels: newLabel ? [newLabel] : [],
    };

    const { data, error } = await supabase.from("cards").insert(newCard).select();

    if (error) toast.error(error.message);
    else {
      setNewCardTitle("");
      setSelectedListId(null);
      setNewDueDate(undefined);
      setNewLabel(null);
      toast.success("Card added!");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (error) toast.error(error.message);
    else toast.success("Card deleted");
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<CardType>) => {
    const { error } = await supabase.from("cards").update(updates).eq("id", cardId);
    if (error) toast.error(error.message);
  };

  const handleAddComment = async (cardId: string, content: string) => {
    if (!content.trim()) return;

    const { error } = await supabase.from("comments").insert({
      card_id: cardId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      content,
    });

    if (error) toast.error(error.message);
    else toast.success("Comment added");
  };

  const handleRenameBoard = async () => {
    if (!board.title.trim()) return toast.error("Title cannot be empty");

    const { error } = await supabase.from("boards").update({ title: board.title }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Board renamed");
  };

  const handleDeleteBoard = async () => {
    if (!confirm("Delete board and all cards? This cannot be undone.")) return;

    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Board deleted");
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-12 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[500px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="relative">
        <div
          className="h-48 md:h-64 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${board?.cover_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
              {board?.title || "Board"}
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-6 -mt-16 relative z-10">
          <div className="flex justify-end gap-3 mb-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename Board</DialogTitle>
                </DialogHeader>
                <Input
                  value={board.title}
                  onChange={(e) => setBoard({ ...board, title: e.target.value })}
                />
                <Button onClick={handleRenameBoard}>Save</Button>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={handleDeleteBoard}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Board
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {defaultLists.map((list) => (
                <Card key={list.id} className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{list.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-h-[500px]">
                    <SortableContext
                      items={cards.filter((c) => c.list_id === list.id).map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {cards
                        .filter((c) => c.list_id === list.id)
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map((card) => (
                          <SortableCard key={card.id} id={card.id}>
                            <div className="p-4 bg-muted/50 rounded-lg border border-border/30 shadow-sm hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                  <h4 className="font-medium mb-1">{card.title}</h4>

                                  {card.labels && card.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {card.labels.map((label: LabelColor) => (
                                        <span
                                          key={label}
                                          className={cn(
                                            "px-2 py-0.5 text-xs rounded-full border",
                                            labelColors[label]
                                          )}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {card.due_date && (
                                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(card.due_date), "MMM d, yyyy")}
                                    </div>
                                  )}

                                  {/* Comments */}
                                  {card.comments && card.comments.length > 0 && (
                                    <div className="mt-3 pt-2 border-t text-sm text-muted-foreground">
                                      {card.comments.map((comment) => (
                                        <p key={comment.id} className="mb-1">
                                          <span className="font-medium">
                                            {comment.user_id.slice(0, 8)}...
                                          </span>
                                          : {comment.content}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Add comment */}
                                  <div className="mt-3">
                                    <Input
                                      placeholder="Add a comment..."
                                      className="text-sm"
                                      onKeyDown={async (e) => {
                                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                          await handleAddComment(card.id, e.currentTarget.value.trim());
                                          e.currentTarget.value = "";
                                        }
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDeleteCard(card.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-3 pt-3 border-t">
                                <select
                                  className="text-sm border rounded p-1 bg-background min-w-[120px]"
                                  value=""
                                  onChange={(e) => handleUpdateCard(card.id, { list_id: e.target.value })}
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
                              </div>
                            </div>
                          </SortableCard>
                        ))}
                    </SortableContext>

                    <Dialog open={selectedListId === list.id} onOpenChange={(open) => !open && setSelectedListId(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => setSelectedListId(list.id)}>
                          <Plus className="h-4 w-4" />
                          Add Card
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

                          <div className="space-y-2">
                            <Label>Due Date (optional)</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !newDueDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {newDueDate ? format(newDueDate, "PPP") : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newDueDate}
                                  onSelect={setNewDueDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label>Labels (optional)</Label>
                            <div className="flex flex-wrap gap-2">
                              {(["green", "red", "blue", "yellow", "purple"] as LabelColor[]).map((color) => (
                                <Button
                                  key={color}
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "border-2",
                                    newLabel === color ? `border-${color}-500` : "border-transparent",
                                    `bg-${color}-500/10 hover:bg-${color}-500/20`
                                  )}
                                  onClick={() => setNewLabel(newLabel === color ? null : color)}
                                >
                                  {color}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <Button onClick={handleAddCard} disabled={!newCardTitle.trim() || loading}>
                            {loading ? "Adding..." : "Add Card"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}