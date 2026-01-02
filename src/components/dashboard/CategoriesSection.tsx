import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Tag, Trash2, Folder, Star, Briefcase, Home, Heart, Code, Book, Pencil, AlertTriangle, Link2, Users, Lightbulb } from "lucide-react";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
  user_id?: string;
}

interface CategoryCounts {
  links: number;
  accounts: number;
  ideas: number;
}

const iconOptions = [
  { name: "Folder", icon: Folder },
  { name: "Star", icon: Star },
  { name: "Briefcase", icon: Briefcase },
  { name: "Home", icon: Home },
  { name: "Heart", icon: Heart },
  { name: "Code", icon: Code },
  { name: "Book", icon: Book },
  { name: "Tag", icon: Tag },
];

const colorOptions = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Indigo", value: "#6366f1" },
];

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, CategoryCounts>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "Folder",
    color: "#06b6d4",
  });

  const { getData, insertData, updateData, deleteData, userId } = useLocalDatabase();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getData("categories");
      const sortedData = (data as Category[]).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setCategories(sortedData);
      
      // Fetch counts for each category
      await fetchCategoryCounts(sortedData);
    } catch (error) {
      toast.error("Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryCounts = async (cats: Category[]) => {
    const counts: Record<string, CategoryCounts> = {};
    
    const [linksData, accountsData, ideasData] = await Promise.all([
      getData("links"),
      getData("accounts"),
      getData("ideas"),
    ]);
    
    for (const cat of cats) {
      counts[cat.id] = {
        links: (linksData as any[]).filter(l => l.category_id === cat.id).length,
        accounts: (accountsData as any[]).filter(a => a.category_id === cat.id).length,
        ideas: (ideasData as any[]).filter(i => i.category_id === cat.id).length,
      };
    }
    
    setCategoryCounts(counts);
  };

  const resetForm = () => {
    setFormData({ name: "", icon: "Folder", color: "#06b6d4" });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || "Folder",
      color: category.color || "#06b6d4",
    });
    setOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category);
    setTargetCategoryId("");
    setDeleteDialogOpen(true);
  };

  const getTotalItems = (categoryId: string) => {
    const counts = categoryCounts[categoryId];
    if (!counts) return 0;
    return counts.links + counts.accounts + counts.ideas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (formData.name.length > 50) {
      toast.error("Le nom ne peut pas dépasser 50 caractères");
      return;
    }

    try {
      if (!userId) throw new Error("Non authentifié");

      if (editingCategory) {
        await updateData("categories", editingCategory.id, {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
        });
        toast.success("Catégorie modifiée avec succès");
      } else {
        await insertData("categories", {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          user_id: userId,
        });
        toast.success("Catégorie créée avec succès");
      }

      resetForm();
      setOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    
    const totalItems = getTotalItems(categoryToDelete.id);
    
    try {
      // Transfer items to new category if selected
      if (targetCategoryId && totalItems > 0) {
        const newCategoryId = targetCategoryId === "none" ? null : targetCategoryId;
        
        const [linksData, accountsData, ideasData] = await Promise.all([
          getData("links"),
          getData("accounts"),
          getData("ideas"),
        ]);
        
        // Update items with the new category
        const linksToUpdate = (linksData as any[]).filter(l => l.category_id === categoryToDelete.id);
        const accountsToUpdate = (accountsData as any[]).filter(a => a.category_id === categoryToDelete.id);
        const ideasToUpdate = (ideasData as any[]).filter(i => i.category_id === categoryToDelete.id);
        
        await Promise.all([
          ...linksToUpdate.map(l => updateData("links", l.id, { category_id: newCategoryId })),
          ...accountsToUpdate.map(a => updateData("accounts", a.id, { category_id: newCategoryId })),
          ...ideasToUpdate.map(i => updateData("ideas", i.id, { category_id: newCategoryId })),
        ]);
      }
      
      await deleteData("categories", categoryToDelete.id);
      
      toast.success("Catégorie supprimée");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.name === iconName);
    return iconOption ? iconOption.icon : Tag;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Catégories</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Organisez vos éléments par catégories personnalisées</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-vault w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Modifier la catégorie" : "Créer une catégorie"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Travail, Personnel..."
                  maxLength={50}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Icône</Label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: option.name })}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          formData.icon === option.name
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <IconComponent className="w-5 h-5 mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                        formData.color === option.value
                          ? "border-foreground ring-2 ring-foreground/20"
                          : "border-border"
                      }`}
                      style={{ backgroundColor: option.value }}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingCategory ? "Modifier" : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon || "Tag");
          const counts = categoryCounts[category.id] || { links: 0, accounts: 0, ideas: 0 };
          const total = counts.links + counts.accounts + counts.ideas;
          
          return (
            <Card key={category.id} className="hover:shadow-vault transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <IconComponent 
                    className="w-6 h-6" 
                    style={{ color: category.color || "#06b6d4" }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(category)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    <span>{counts.links}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{counts.accounts}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    <span>{counts.ideas}</span>
                  </div>
                  <span className="ml-auto font-medium text-foreground">{total} éléments</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune catégorie créée</p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre première catégorie pour organiser vos éléments</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer la catégorie
            </DialogTitle>
            <DialogDescription>
              {categoryToDelete && (
                <>
                  La catégorie "{categoryToDelete.name}" contient <strong>{getTotalItems(categoryToDelete.id)} éléments</strong>.
                  {getTotalItems(categoryToDelete.id) > 0 && (
                    <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-4 h-4" />
                        {categoryCounts[categoryToDelete.id]?.links || 0} liens
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" />
                        {categoryCounts[categoryToDelete.id]?.accounts || 0} comptes
                      </div>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        {categoryCounts[categoryToDelete.id]?.ideas || 0} idées
                      </div>
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {categoryToDelete && getTotalItems(categoryToDelete.id) > 0 && (
            <div className="space-y-2">
              <Label>Transférer les éléments vers :</Label>
              <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie ou laisser sans catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans catégorie</SelectItem>
                  {categories
                    .filter(c => c.id !== categoryToDelete.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vous pouvez aussi renommer cette catégorie au lieu de la supprimer.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            {categoryToDelete && getTotalItems(categoryToDelete.id) > 0 && (
              <Button variant="secondary" onClick={() => {
                setDeleteDialogOpen(false);
                openEditDialog(categoryToDelete);
              }}>
                Renommer
              </Button>
            )}
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={categoryToDelete && getTotalItems(categoryToDelete.id) > 0 && !targetCategoryId}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
