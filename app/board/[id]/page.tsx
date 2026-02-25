"use client";

import { useEffect, useState, useRef } from "react";
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
import { CalendarIcon, Plus, Trash2, Tag, Clock, Edit, Paperclip, ListChecks, History, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import SortableCard from "@/components/SortableCard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type LabelColor = "green" | "red" | "blue" | "yellow" | "purple";

type AttachmentType = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
};

type ChecklistType = {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
};

type ActivityType = {
  id: string;
  action: string;
  details: any;
  user_id: string;
  created_at: string;
};

type BoardLabelType = {
  id: string;
  name: string;
  color: string;
};

type CardType = {
  id: string;
  title: string;
  list_id: string;
  position: number;
  labels?: string[]; // board_labels.id
  due_date?: string | null;
  attachments?: AttachmentType[];
  checklists?: ChecklistType[];
  activities?: ActivityType[];
  created_at: string;
};

const defaultLists = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const labelColors: Record<string, string> = {
  green: "bg-green-500/20 text-green-700 border-green-500/30",
  red: "bg-red-500/20 text-red-700 border-red-500/30",
  blue: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  yellow: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  purple: "bg-purple-500/20 text-purple-700 border-purple-500/30",
};

export default function BoardDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [board, setBoard] = useState<any>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [boardLabels, setBoardLabels] = useState<BoardLabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("green");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
        setEditingTitle(boardData.title);

        const { data: labelsData } = await supabase
          .from("board_labels")
          .select("*")
          .eq("board_id", id)
          .order("name");
        setBoardLabels(labelsData || []);

        const { data: cardData, error: cardError } = await supabase
          .from("cards")
          .select(`
            *,
            attachments(*),
            checklists(*),
            activities(*)
          `)
          .eq("board_id", id)
          .order("position", { ascending: true });

        if (cardError) toast.error("Failed to load cards: " + cardError.message);
        else setCards(cardData || []);

        setLoading(false);
      } catch (err) {
        toast.error("Unexpected error");
        setLoading(false);
      }
    };

    loadData();

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

  const filteredCards = cards.filter((card) => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      card.title.toLowerCase().includes(lower) ||
      boardLabels.some(l => card.labels?.includes(l.id) && l.name.toLowerCase().includes(lower)) ||
      card.due_date?.toLowerCase().includes(lower)
    );
  });

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

    const { error } = await supabase
      .from("cards")
      .update({ list_id: newListId, position: newPosition })
      .eq("id", active.id);

    if (error) {
      toast.error("Failed to move card");
    } else {
      toast.success("Card moved");
      await logActivity(active.id as string, "moved_card", {
        from_list: activeListId,
        to_list: newListId,
        position: newPosition,
      });
    }
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
      labels: selectedLabels,
    };

    const { data, error } = await supabase.from("cards").insert(newCard).select();

    if (error) toast.error(error.message);
    else {
      setNewCardTitle("");
      setSelectedListId(null);
      setNewDueDate(undefined);
      setSelectedLabels([]);
      toast.success("Card added!");
      if (data?.[0]) {
        await logActivity(data[0].id, "created_card", { title: newCardTitle });
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (error) toast.error(error.message);
    else {
      toast.success("Card deleted");
      await logActivity(cardId, "deleted_card");
    }
  };

  const handleUploadAttachment = async (cardId: string, file: File) => {
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `card-${cardId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('card-attachments')
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      return;
    }

    const { data: attachment } = await supabase
      .from("card_attachments")
      .insert({
        card_id: cardId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (attachment) {
      toast.success("File attached!");
      await logActivity(cardId, "attached_file", { file_name: file.name });
    }
  };

  const handleAddChecklist = async (cardId: string) => {
    if (!newChecklistTitle.trim()) return toast.error("Enter checklist title");

    const maxPos = cards.find(c => c.id === cardId)?.checklists?.length || 0;

    const { data, error } = await supabase
      .from("card_checklists")
      .insert({
        card_id: cardId,
        title: newChecklistTitle,
        position: maxPos,
      })
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      toast.success("Checklist item added");
      await logActivity(cardId, "added_checklist", { title: newChecklistTitle });
      setNewChecklistTitle("");
    }
  };

  const handleToggleChecklist = async (checklistId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("card_checklists")
      .update({ is_completed: !isCompleted })
      .eq("id", checklistId);

    if (error) toast.error(error.message);
    else toast.success("Checklist updated");
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return toast.error("Enter email");

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", inviteEmail.trim())
      .single();

    if (userError || !userData) {
      toast.error("User not found. They must sign up first.");
      return;
    }

    const { error } = await supabase.from("board_members").insert({
      board_id: id,
      user_id: userData.id,
      role: "member",
    });

    if (error) toast.error(error.message);
    else {
      toast.success(`Added ${inviteEmail} as member`);
      setInviteEmail("");
      await logActivity(id as string, "invited_member", { email: inviteEmail });
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return toast.error("Enter label name");

    const { data, error } = await supabase
      .from("board_labels")
      .insert({
        board_id: id,
        name: newLabelName,
        color: newLabelColor,
      })
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      toast.success("Label created");
      setBoardLabels([...boardLabels, data]);
      setNewLabelName("");
      await logActivity(id as string, "created_label", { name: newLabelName });
    }
  };

  const handleRenameBoard = async () => {
    if (!editingTitle.trim()) {
      toast.error("Board title cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("boards")
      .update({ title: editingTitle })
      .eq("id", id);

    if (error) {
      toast.error("Failed to rename board: " + error.message);
    } else {
      toast.success("Board renamed successfully");
      setBoard({ ...board, title: editingTitle });
    }
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

  const logActivity = async (cardId: string | number, action: string, details: any = {}) => {
    const user = await supabase.auth.getUser();
    await supabase.from("card_activities").insert({
      card_id: cardId,
      user_id: user.data.user?.id,
      action,
      details,
    });
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
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                />
                <Button onClick={handleRenameBoard}>Save</Button>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={handleDeleteBoard}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Board
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                                      {card.labels.map((labelId) => {
                                        const lbl = boardLabels.find(l => l.id === labelId);
                                        return lbl ? (
                                          <Badge key={labelId} variant="outline" className={cn("text-xs", labelColors[lbl.color] || "")}>
                                            {lbl.name}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  )}

                                  {card.due_date && (
                                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(card.due_date), "MMM d, yyyy")}
                                    </div>
                                  )}

                                  {card.attachments && card.attachments.length > 0 && (
                                    <div className="mt-3 pt-2 border-t text-sm">
                                      <p className="font-medium">Attachments:</p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {card.attachments.map((att) => (
                                          <a
                                            key={att.id}
                                            href={supabase.storage.from('card-attachments').getPublicUrl(att.file_path).data.publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-xs truncate max-w-[120px]"
                                          >
                                            {att.file_name}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {card.checklists && card.checklists.length > 0 && (
                                    <div className="mt-3 pt-2 border-t text-sm">
                                      <p className="font-medium">Checklist:</p>
                                      <div className="mt-1 space-y-1">
                                        {card.checklists.map((item) => (
                                          <div key={item.id} className="flex items-center gap-2">
                                            <Switch
                                              checked={item.is_completed}
                                              onCheckedChange={() => handleToggleChecklist(item.id, item.is_completed)}
                                            />
                                            <span className={item.is_completed ? "line-through text-muted-foreground" : ""}>
                                              {item.title}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {card.activities && card.activities.length > 0 && (
                                    <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                                      <p className="font-medium">Activity:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {card.activities.slice(0, 5).map((act) => (
                                          <p key={act.id}>
                                            {format(new Date(act.created_at), "MMM d, h:mm a")}: {act.action}
                                            {act.details ? ` (${JSON.stringify(act.details)})` : ''}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    <input
                                      type="file"
                                      id={`file-${card.id}`}
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadAttachment(card.id, file);
                                      }}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => document.getElementById(`file-${card.id}`)?.click()}
                                    >
                                      <Paperclip className="h-4 w-4 mr-2" />
                                      Attach
                                    </Button>
                                  </div>

                                  <div className="mt-2">
                                    <Input
                                      placeholder="Add checklist item..."
                                      className="text-sm"
                                      value={newChecklistTitle}
                                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && newChecklistTitle.trim()) {
                                          handleAddChecklist(card.id, newChecklistTitle);
                                          setNewChecklistTitle("");
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
                            <Label>Status Labels (optional)</Label>
                            <div className="flex flex-wrap gap-2">
                              {boardLabels.map((lbl) => (
                                <Button
                                  key={lbl.id}
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "border-2",
                                    selectedLabels.includes(lbl.id) ? `border-${lbl.color}-500` : "border-transparent",
                                    `bg-${lbl.color}-500/10 hover:bg-${lbl.color}-500/20`
                                  )}
                                  onClick={() => {
                                    setSelectedLabels(prev =>
                                      prev.includes(lbl.id)
                                        ? prev.filter(id => id !== lbl.id)
                                        : [...prev, lbl.id]
                                    );
                                  }}
                                >
                                  {lbl.name}
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

          <div className="mt-8">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite to Board</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleInviteMember} disabled={!inviteEmail.trim()}>
                    Send Invite
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  New Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                  />
                  <select
                    className="w-full p-2 border rounded"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                  >
                    <option value="green">Green</option>
                    <option value="red">Red</option>
                    <option value="blue">Blue</option>
                    <option value="yellow">Yellow</option>
                    <option value="purple">Purple</option>
                  </select>
                  <Button onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                    Create Label
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}