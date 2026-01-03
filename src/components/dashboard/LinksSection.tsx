import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Link2, ExternalLink, Trash2, Grid3x3, List, Tag, Pencil, Filter, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useAutoDraft } from "@/hooks/useAutoDraft";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { PendingBadge } from "./PendingBadge";

interface Link {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category_id: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export function LinksSection() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    category_id: "",
  });

  const { loadDraft, clearDraft } = useAutoDraft(formData, "link-draft", 15000);
  const { getData, insertData, updateData, deleteData, isInitialized, pendingIds } = useLocalDatabase();

  useEffect(() => {
    if (isInitialized) {
      fetchLinks();
      fetchCategories();
    }
  }, [isInitialized]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && !editingLink) {
      setFormData({
        title: draft.title || "",
        url: draft.url || "",
        description: draft.description || "",
        category_id: draft.category_id || "",
      });
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getData<Category>("categories");
      setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchLinks = async () => {
    try {
      const data = await getData<Link>("links");
      setLinks(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      toast.error("Erreur lors du chargement des liens");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", url: "", description: "", category_id: "" });
    setEditingLink(null);
    clearDraft();
  };

  const openEditDialog = (link: Link) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || "",
      category_id: link.category_id || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || formData.title.length > 200) {
      toast.error("Le titre doit contenir entre 1 et 200 caractères");
      return;
    }

    if (!formData.url.trim() || formData.url.length > 2048) {
      toast.error("L'URL ne peut pas dépasser 2048 caractères");
      return;
    }

    if (formData.description && formData.description.length > 1000) {
      toast.error("La description ne peut pas dépasser 1000 caractères");
      return;
    }

    try {
      const linkData = {
        title: formData.title.trim(),
        url: formData.url.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
      };

      if (editingLink) {
        await updateData("links", editingLink.id, linkData);
        toast.success("Lien modifié avec succès");
      } else {
        await insertData("links", linkData);
        toast.success("Lien ajouté avec succès");
      }

      resetForm();
      setOpen(false);
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteData("links", id);
      toast.success("Lien déplacé vers la corbeille");
      fetchLinks();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getCategoryForLink = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  const filteredLinks = filterCategory === "all" 
    ? links 
    : filterCategory === "uncategorized"
      ? links.filter(l => !l.category_id)
      : links.filter(l => l.category_id === filterCategory);

  const exportToCSV = () => {
    const headers = ["Titre", "URL", "Description", "Catégorie", "Date de création"];
    const rows = filteredLinks.map(link => {
      const category = getCategoryForLink(link.category_id);
      return [
        link.title,
        link.url,
        link.description || "",
        category?.name || "Sans catégorie",
        new Date(link.created_at).toLocaleDateString("fr-FR"),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liens_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV réussi");
  };

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Veuillez autoriser les popups pour exporter en PDF");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mes Liens - VaultKeep</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0891b2; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #0891b2; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .date { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Mes Liens</h1>
        <p class="date">Exporté le ${new Date().toLocaleDateString("fr-FR")}</p>
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>URL</th>
              <th>Description</th>
              <th>Catégorie</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLinks.map(link => {
              const category = getCategoryForLink(link.category_id);
              return `
                <tr>
                  <td>${link.title}</td>
                  <td><a href="${link.url}">${link.url}</a></td>
                  <td>${link.description || "-"}</td>
                  <td>${category?.name || "Sans catégorie"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    toast.success("Ouverture de l'impression PDF");
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Liens</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Organisez et accédez rapidement à vos liens importants</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="uncategorized">Sans catégorie</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                Nouveau lien
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLink ? "Modifier le lien" : "Ajouter un lien"}</DialogTitle>
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
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    maxLength={2048}
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={1000}
                    rows={3}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Brouillon auto-sauvegardé après 15 secondes
                  </p>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  {editingLink ? "Modifier" : "Ajouter"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
        {filteredLinks.map((link) => {
          const category = getCategoryForLink(link.category_id);
          const isPending = pendingIds.has(link.id);
          return (
            <Card key={link.id} className="hover:shadow-vault transition-shadow rounded-xl">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{link.title}</CardTitle>
                      <PendingBadge isPending={isPending} />
                    </div>
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
                    onClick={() => openEditDialog(link)}
                    className="rounded-lg"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                    className="rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
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
          );
        })}
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {filterCategory !== "all" ? "Aucun lien dans cette catégorie" : "Aucun lien enregistré"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter votre premier lien</p>
        </div>
      )}
    </div>
  );
}
