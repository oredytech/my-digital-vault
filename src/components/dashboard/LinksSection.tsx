import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Link2, ExternalLink, Trash2 } from "lucide-react";

interface Link {
  id: string;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
}

export function LinksSection() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des liens");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("links").insert({
        title: formData.title,
        url: formData.url,
        description: formData.description || null,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Lien ajouté avec succès");
      setFormData({ title: "", url: "", description: "" });
      setOpen(false);
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du lien");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lien supprimé");
      fetchLinks();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mes Liens</h2>
          <p className="text-muted-foreground mt-1">Organisez et accédez rapidement à vos liens importants</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-vault">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau lien
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un lien</DialogTitle>
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
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnelle)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.id} className="hover:shadow-vault transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start space-x-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{link.title}</CardTitle>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(link.id)}
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              {link.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {link.description}
                </p>
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Ouvrir le lien
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun lien enregistré</p>
          <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter votre premier lien</p>
        </div>
      )}
    </div>
  );
}
