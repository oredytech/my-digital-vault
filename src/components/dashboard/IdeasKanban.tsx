import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Lightbulb, Sparkles, Trash2, Loader2, Tag, GripVertical, ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { PendingBadge } from "./PendingBadge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Idea {
  id: string;
  title: string;
  content: string;
  ai_suggestions: any;
  category_id: string | null;
  status: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

type KanbanStatus = "todo" | "in_progress" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: typeof Clock; color: string }[] = [
  { id: "todo", label: "À faire", icon: Clock, color: "text-yellow-500" },
  { id: "in_progress", label: "En cours", icon: PlayCircle, color: "text-blue-500" },
  { id: "done", label: "Terminé", icon: CheckCircle2, color: "text-green-500" },
];

export function IdeasKanban() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category_id: "",
    status: "todo" as KanbanStatus,
  });

  const { getData, insertData, updateData, deleteData, isInitialized, pendingIds, isOnline } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) {
      fetchIdeas();
      fetchCategories();
    }
  }, [isInitialized]);

  const fetchCategories = async () => {
    try {
      const data = await getData<Category>("categories");
      setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchIdeas = async () => {
    try {
      const data = await getData<Idea>("ideas");
      setIdeas(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      toast.error("Erreur lors du chargement des idées");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", category_id: "", status: "todo" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    try {
      await insertData("ideas", {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category_id: formData.category_id || null,
        status: formData.status,
      });
      toast.success("Idée ajoutée");
      resetForm();
      setOpen(false);
      fetchIdeas();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteData("ideas", id);
      toast.success("Idée supprimée");
      fetchIdeas();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const moveIdea = async (ideaId: string, newStatus: KanbanStatus) => {
    try {
      await updateData("ideas", ideaId, { status: newStatus });
      fetchIdeas();
    } catch (error) {
      toast.error("Erreur lors du déplacement");
    }
  };

  const generateSuggestions = async (idea: Idea) => {
    setGeneratingSuggestions(idea.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("suggest-ideas", {
        body: { ideaContent: idea.content },
      });

      if (error) throw error;

      await updateData("ideas", idea.id, { ai_suggestions: { suggestions: data.suggestions } });
      toast.success("Suggestions générées !");
      fetchIdeas();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setGeneratingSuggestions(null);
    }
  };

  const getCategoryForIdea = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  const getIdeasByStatus = (status: KanbanStatus) => {
    return ideas.filter(idea => (idea.status || "todo") === status);
  };

  const getNextStatus = (current: KanbanStatus): KanbanStatus | null => {
    const idx = KANBAN_COLUMNS.findIndex(c => c.id === current);
    if (idx < KANBAN_COLUMNS.length - 1) {
      return KANBAN_COLUMNS[idx + 1].id;
    }
    return null;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Tableau Kanban</h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Gérez vos idées visuellement</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-vault rounded-xl w-full sm:w-auto" size="sm">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="sm:inline">Nouvelle idée</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nouvelle idée</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-foreground">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: KanbanStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        <div className="flex items-center gap-2">
                          <col.icon className={cn("w-4 h-4", col.color)} />
                          {col.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">Catégorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="text-foreground">Description</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl">
                Ajouter
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board - Mobile horizontal scroll, Desktop grid */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible">
        {KANBAN_COLUMNS.map((column) => {
          const columnIdeas = getIdeasByStatus(column.id);
          const Icon = column.icon;
          
          return (
            <div 
              key={column.id} 
              className="flex-shrink-0 w-[85vw] sm:w-[300px] lg:w-auto lg:flex-1 snap-center"
            >
              <div className="bg-muted/30 rounded-xl p-2 sm:p-3 h-full">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 px-1">
                  <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", column.color)} />
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{column.label}</h3>
                  <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 sm:px-2 py-0.5 rounded-full ml-auto">
                    {columnIdeas.length}
                  </span>
                </div>
                
                <ScrollArea className="h-[55vh] sm:h-[60vh] lg:h-[65vh]">
                  <div className="space-y-2 pr-2">
                    {columnIdeas.map((idea) => {
                      const category = getCategoryForIdea(idea.category_id);
                      const isPending = pendingIds.has(idea.id);
                      const nextStatus = getNextStatus(column.id);
                      
                      return (
                        <Card 
                          key={idea.id} 
                          className="hover:shadow-md transition-shadow rounded-xl bg-card"
                        >
                          <CardContent className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate text-foreground">{idea.title}</span>
                              </div>
                              <PendingBadge isPending={isPending} />
                            </div>
                            
                            {idea.content && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 pl-5 sm:pl-6">
                                {idea.content}
                              </p>
                            )}
                            
                            {category && (
                              <div className="flex items-center pl-5 sm:pl-6">
                                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" style={{ color: category.color || '#06b6d4' }} />
                                <span className="text-[10px] sm:text-xs" style={{ color: category.color || '#06b6d4' }}>
                                  {category.name}
                                </span>
                              </div>
                            )}
                            
                            {idea.ai_suggestions && (
                              <div className="pl-5 sm:pl-6 pt-1 border-t border-border">
                                <div className="flex items-center text-[10px] sm:text-xs text-primary">
                                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                  IA disponible
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-1 pl-5 sm:pl-6">
                              <div className="flex gap-0.5 sm:gap-1">
                                {!idea.ai_suggestions && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => generateSuggestions(idea)}
                                    disabled={generatingSuggestions === idea.id || !isOnline}
                                    className="h-5 w-5 sm:h-6 sm:w-6"
                                    title="Enrichir avec l'IA"
                                  >
                                    {generatingSuggestions === idea.id ? (
                                      <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(idea.id)}
                                  className="h-5 w-5 sm:h-6 sm:w-6 text-destructive"
                                >
                                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </Button>
                              </div>
                              
                              {nextStatus && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveIdea(idea.id, nextStatus)}
                                  className="h-5 sm:h-6 text-[10px] sm:text-xs px-1.5 sm:px-2"
                                >
                                  <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                  <span className="hidden sm:inline">{KANBAN_COLUMNS.find(c => c.id === nextStatus)?.label}</span>
                                  <span className="sm:hidden">→</span>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {columnIdeas.length === 0 && (
                      <div className="text-center py-6 sm:py-8 text-muted-foreground">
                        <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-[10px] sm:text-xs">Aucune idée</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
