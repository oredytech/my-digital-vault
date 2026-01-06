import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Pin, PinOff, Pencil, Search, Eye } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { PendingBadge } from "./PendingBadge";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

const NOTE_COLORS = [
  { value: null, label: "Défaut", class: "bg-card" },
  { value: "yellow", label: "Jaune", class: "bg-yellow-500/20 border-yellow-500/30" },
  { value: "green", label: "Vert", class: "bg-green-500/20 border-green-500/30" },
  { value: "blue", label: "Bleu", class: "bg-blue-500/20 border-blue-500/30" },
  { value: "purple", label: "Violet", class: "bg-purple-500/20 border-purple-500/30" },
  { value: "pink", label: "Rose", class: "bg-pink-500/20 border-pink-500/30" },
  { value: "orange", label: "Orange", class: "bg-orange-500/20 border-orange-500/30" },
];

// Simple Markdown renderer
function renderMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/gim, '<del class="line-through">$1</del>')
    // Code inline
    .replace(/`(.*?)`/gim, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" class="text-primary underline hover:no-underline">$1</a>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground">$1</blockquote>')
    // Checkboxes
    .replace(/\[ \] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" disabled class="rounded" /><span>$1</span></div>')
    .replace(/\[x\] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" checked disabled class="rounded" /><span class="line-through text-muted-foreground">$1</span></div>')
    // Line breaks
    .replace(/\n/gim, '<br />');
}

export function QuickNotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: null as string | null,
  });

  const { getData, insertData, updateData, deleteData, isInitialized, pendingIds } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) {
      fetchNotes();
    }
  }, [isInitialized]);

  const fetchNotes = async () => {
    try {
      const data = await getData<Note>("notes");
      // Sort: pinned first, then by updated_at
      setNotes(data.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }));
    } catch (error) {
      toast.error("Erreur lors du chargement des notes");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", color: null });
    setEditingNote(null);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      color: note.color,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const noteData = {
        title: formData.title.trim() || "Note sans titre",
        content: formData.content,
        color: formData.color,
      };

      if (editingNote) {
        await updateData("notes", editingNote.id, noteData);
        toast.success("Note modifiée");
      } else {
        await insertData("notes", { ...noteData, is_pinned: false });
        toast.success("Note créée");
      }

      resetForm();
      setOpen(false);
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteData("notes", id);
      toast.success("Note supprimée");
      fetchNotes();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await updateData("notes", note.id, { is_pinned: !note.is_pinned });
      toast.success(note.is_pinned ? "Note désépinglée" : "Note épinglée");
      fetchNotes();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const openPreview = (note: Note) => {
    setPreviewNote(note);
    setPreviewOpen(true);
  };

  const getNoteColorClass = (color: string | null) => {
    return NOTE_COLORS.find(c => c.value === color)?.class || "bg-card";
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Notes Rapides</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Prenez des notes avec support Markdown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[200px] rounded-xl"
            />
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-vault rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingNote ? "Modifier la note" : "Nouvelle note"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Titre (optionnel)"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value || "default"}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 transition-all",
                        color.class,
                        formData.color === color.value ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                      title={color.label}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Écrivez votre note en Markdown...

Syntaxe supportée:
# Titre
**gras** *italique* ~~barré~~
- liste
1. liste numérotée
> citation
`code`
[lien](url)
[ ] tâche
[x] tâche terminée"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>
                {formData.content && (
                  <div className="border rounded-xl p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-2">Aperçu:</p>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
                    />
                  </div>
                )}
                <Button type="submit" className="w-full rounded-xl">
                  {editingNote ? "Modifier" : "Créer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => {
          const isPending = pendingIds.has(note.id);
          return (
            <Card 
              key={note.id} 
              className={cn(
                "hover:shadow-vault transition-all rounded-xl relative group",
                getNoteColorClass(note.color)
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {note.is_pinned && (
                      <Pin className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">{note.title}</CardTitle>
                    <PendingBadge isPending={isPending} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPreview(note)}
                      className="h-7 w-7"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePin(note)}
                      className="h-7 w-7"
                    >
                      {note.is_pinned ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(note)}
                      className="h-7 w-7"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(note.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="text-sm text-muted-foreground line-clamp-4 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content.slice(0, 200)) }}
                />
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(note.updated_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "Aucune note trouvée" : "Aucune note"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre première note avec support Markdown</p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewNote?.is_pinned && <Pin className="w-4 h-4 text-primary" />}
              {previewNote?.title}
            </DialogTitle>
          </DialogHeader>
          {previewNote && (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(previewNote.content) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
