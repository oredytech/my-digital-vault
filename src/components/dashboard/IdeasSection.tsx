import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Lightbulb, Sparkles, Trash2, Loader2 } from "lucide-react";

interface Idea {
  id: string;
  title: string;
  content: string;
  ai_suggestions: any;
  created_at: string;
}

export function IdeasSection() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    fetchIdeas();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("ideas").insert({
        title: formData.title,
        content: formData.content,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Idée ajoutée avec succès");
      setFormData({ title: "", content: "" });
      setOpen(false);
      fetchIdeas();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout de l'idée");
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

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mes Idées</h2>
          <p className="text-muted-foreground mt-1">Capturez vos idées et enrichissez-les avec l'IA</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-vault">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle idée
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une idée</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => (
          <Card key={idea.id} className="hover:shadow-vault transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-start space-x-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{idea.title}</CardTitle>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(idea.id)}
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{idea.content}</p>
              
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
                  className="w-full"
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
        ))}
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
