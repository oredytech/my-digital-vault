import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Lightbulb, Sparkles, Trash2, Loader2, Grid3x3, List, Tag, Pencil } from "lucide-react";
import { useAutoDraft } from "@/hooks/useAutoDraft";

interface Idea {
  id: string;
  title: string;
  content: string;
  ai_suggestions: any;
  category_id: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export function IdeasSection() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category_id: "",
  });

  const { loadDraft, clearDraft } = useAutoDraft(formData, "idea-draft", 15000);

  useEffect(() => {
    fetchIdeas();
    fetchCategories();
    
    // Load draft on mount
    const draft = loadDraft();
    if (draft && !editingIdea) {
      setFormData({
        title: draft.title || "",
        content: draft.content || "",
        category_id: draft.category_id || "",
      });
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des idées");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", category_id: "" });
    setEditingIdea(null);
    clearDraft();
  };

  const openEditDialog = (idea: Idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      content: idea.content,
      category_id: idea.category_id || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || formData.title.length > 200) {
      toast.error("Le titre doit contenir entre 1 et 200 caractères");
      return;
    }

    if (!formData.content.trim() || formData.content.length > 5000) {
      toast.error("Le contenu doit contenir entre 1 et 5000 caractères");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (editingIdea) {
        const { error } = await supabase
          .from("ideas")
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            category_id: formData.category_id || null,
          })
          .eq("id", editingIdea.id);

        if (error) throw error;
        toast.success("Idée modifiée avec succès");
      } else {
        const { error } = await supabase.from("ideas").insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          category_id: formData.category_id || null,
          user_id: user.id,
        });

        if (error) throw error;
        toast.success("Idée ajoutée avec succès");
      }

      resetForm();
      setOpen(false);
      fetchIdeas();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Idée supprimée");
      fetchIdeas();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const generateSuggestions = async (idea: Idea) => {
    setGeneratingSuggestions(idea.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("suggest-ideas", {
        body: { ideaContent: idea.content },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("ideas")
        .update({ ai_suggestions: { suggestions: data.suggestions } })
        .eq("id", idea.id);

      if (updateError) throw updateError;

      toast.success("Suggestions générées !");
      fetchIdeas();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération des suggestions");
    } finally {
      setGeneratingSuggestions(null);
    }
  };

  const getCategoryForIdea = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Idées</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Capturez vos idées et enrichissez-les avec l'IA</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center border rounded-xl p-1 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 rounded-lg"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-vault flex-1 sm:flex-none rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle idée
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingIdea ? "Modifier l'idée" : "Ajouter une idée"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={200}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Sélectionner une catégorie" />
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
                  <Label htmlFor="content">Contenu *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    maxLength={5000}
                    rows={5}
                    required
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Brouillon auto-sauvegardé après 15 secondes
                  </p>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  {editingIdea ? "Modifier" : "Ajouter"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-4 grid-cols-1 sm:grid-cols-2" : "space-y-3"}>
        {ideas.map((idea) => {
          const category = getCategoryForIdea(idea.category_id);
          return (
            <Card key={idea.id} className="hover:shadow-vault transition-shadow rounded-xl">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{idea.title}</CardTitle>
                    {category && (
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 mr-1" style={{ color: category.color || '#06b6d4' }} />
                        <span className="text-xs" style={{ color: category.color || '#06b6d4' }}>
                          {category.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(idea)}
                    className="rounded-lg"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(idea.id)}
                    className="rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{idea.content}</p>
                
                {idea.ai_suggestions ? (
                  <div className="border-t pt-4">
                    <div className="flex items-center text-sm font-medium mb-2">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Suggestions IA
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {idea.ai_suggestions.suggestions}
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSuggestions(idea)}
                    disabled={generatingSuggestions === idea.id}
                    className="w-full rounded-xl"
                  >
                    {generatingSuggestions === idea.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Enrichir avec l'IA
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ideas.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune idée enregistrée</p>
          <p className="text-sm text-muted-foreground mt-1">Commencez à capturer vos idées</p>
        </div>
      )}
    </div>
  );
}
