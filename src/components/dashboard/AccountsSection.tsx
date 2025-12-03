import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Users, Eye, EyeOff, Trash2, Mail, Lock, Phone, Grid3x3, List, Calendar as CalendarIcon, Tag, Pencil, Clock } from "lucide-react";
import { format, addMonths, addYears, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAutoDraft } from "@/hooks/useAutoDraft";

interface Account {
  id: string;
  name: string;
  website_url: string | null;
  username: string | null;
  email: string | null;
  password_encrypted: string | null;
  cpanel_url: string | null;
  hosting_provider: string | null;
  notes: string | null;
  phone: string | null;
  duration_months: number | null;
  category_id: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 mois" },
  { value: "2", label: "2 mois" },
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "1 an" },
  { value: "24", label: "2 ans" },
  { value: "36", label: "3 ans" },
];

export function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    username: "",
    email: "",
    password_encrypted: "",
    cpanel_url: "",
    hosting_provider: "",
    notes: "",
    phone: "",
    category_id: "",
  });

  const { loadDraft, clearDraft } = useAutoDraft(
    { ...formData, startDate: startDate?.toISOString(), selectedDuration },
    "account-draft",
    15000
  );

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    
    // Load draft on mount
    const draft = loadDraft();
    if (draft && !editingAccount) {
      setFormData({
        name: draft.name || "",
        website_url: draft.website_url || "",
        username: draft.username || "",
        email: draft.email || "",
        password_encrypted: draft.password_encrypted || "",
        cpanel_url: draft.cpanel_url || "",
        hosting_provider: draft.hosting_provider || "",
        notes: draft.notes || "",
        phone: draft.phone || "",
        category_id: draft.category_id || "",
      });
      if (draft.startDate) setStartDate(new Date(draft.startDate));
      if (draft.selectedDuration) setSelectedDuration(draft.selectedDuration);
    }
  }, []);

  // Calculate expiration date when date or duration changes
  const expirationDate = startDate && selectedDuration
    ? addMonths(startDate, parseInt(selectedDuration))
    : null;

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

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des comptes");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      website_url: "",
      username: "",
      email: "",
      password_encrypted: "",
      cpanel_url: "",
      hosting_provider: "",
      notes: "",
      phone: "",
      category_id: "",
    });
    setStartDate(undefined);
    setSelectedDuration("");
    setEditingAccount(null);
    clearDraft();
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      website_url: account.website_url || "",
      username: account.username || "",
      email: account.email || "",
      password_encrypted: account.password_encrypted || "",
      cpanel_url: account.cpanel_url || "",
      hosting_provider: account.hosting_provider || "",
      notes: account.notes || "",
      phone: account.phone || "",
      category_id: account.category_id || "",
    });
    
    const createdDate = new Date(account.created_at);
    setStartDate(createdDate);
    if (account.duration_months) {
      setSelectedDuration(account.duration_months.toString());
    } else {
      setSelectedDuration("");
    }
    setOpen(true);
  };

  const createAutoReminder = async (accountId: string, accountName: string, expDate: Date, userId: string) => {
    const reminderDate = addMonths(expDate, -1); // 1 month before expiration
    
    // Only create reminder if it's in the future
    if (isBefore(new Date(), reminderDate)) {
      await supabase.from("reminders").insert({
        user_id: userId,
        title: `Expiration: ${accountName}`,
        description: `Le compte "${accountName}" expire le ${format(expDate, "dd/MM/yyyy", { locale: fr })}`,
        remind_at: reminderDate.toISOString(),
        related_type: "account",
        related_id: accountId,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.name.length > 200) {
      toast.error("Le nom doit contenir entre 1 et 200 caractères");
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Email invalide");
      return;
    }

    if (formData.notes && formData.notes.length > 2000) {
      toast.error("Les notes ne peuvent pas dépasser 2000 caractères");
      return;
    }

    const durationMonths = selectedDuration ? parseInt(selectedDuration) : null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const accountData = {
        name: formData.name.trim(),
        website_url: formData.website_url.trim() || null,
        username: formData.username.trim() || null,
        email: formData.email.trim() || null,
        password_encrypted: formData.password_encrypted || null,
        cpanel_url: formData.cpanel_url.trim() || null,
        hosting_provider: formData.hosting_provider.trim() || null,
        notes: formData.notes.trim() || null,
        phone: formData.phone.trim() || null,
        duration_months: durationMonths,
        category_id: formData.category_id || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from("accounts")
          .update(accountData)
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast.success("Compte modifié avec succès");
      } else {
        const { data: newAccount, error } = await supabase.from("accounts").insert({
          ...accountData,
          user_id: user.id,
        }).select().single();

        if (error) throw error;

        // Auto-create reminder if duration is set
        if (startDate && durationMonths && newAccount) {
          const expDate = addMonths(startDate, durationMonths);
          await createAutoReminder(newAccount.id, accountData.name, expDate, user.id);
        }

        toast.success("Compte ajouté avec succès");
      }

      resetForm();
      setOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Compte supprimé");
      fetchAccounts();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getCategoryForAccount = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  const getAccountExpiration = (account: Account) => {
    if (!account.duration_months) return null;
    const created = new Date(account.created_at);
    return addMonths(created, account.duration_months);
  };

  const isExpiringSoon = (expDate: Date | null) => {
    if (!expDate) return false;
    const oneMonthFromNow = addMonths(new Date(), 1);
    return isBefore(expDate, oneMonthFromNow);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Comptes</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gérez vos comptes et mots de passe en toute sécurité</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-vault flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau compte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Modifier le compte" : "Ajouter un compte"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du compte *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="website_url">URL du site web</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_encrypted">Mot de passe</Label>
                  <Input
                    id="password_encrypted"
                    type="password"
                    value={formData.password_encrypted}
                    onChange={(e) => setFormData({ ...formData, password_encrypted: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hosting_provider">Hébergeur</Label>
                  <Input
                    id="hosting_provider"
                    value={formData.hosting_provider}
                    onChange={(e) => setFormData({ ...formData, hosting_provider: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpanel_url">URL cPanel</Label>
                  <Input
                    id="cpanel_url"
                    type="url"
                    value={formData.cpanel_url}
                    onChange={(e) => setFormData({ ...formData, cpanel_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                
                {/* Date and Duration Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date de création</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Sélectionner"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={fr}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Durée</Label>
                    <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Durée" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {expirationDate && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">Date d'expiration:</span>
                      <span className="text-primary font-semibold">
                        {format(expirationDate, "dd MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Un rappel sera créé automatiquement 1 mois avant l'expiration
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingAccount ? "Modifier" : "Ajouter"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {accounts.map((account) => {
          const expDate = getAccountExpiration(account);
          const expiring = isExpiringSoon(expDate);
          const category = getCategoryForAccount(account.category_id);
          
          return (
            <Card key={account.id} className={cn(
              "hover:shadow-vault transition-shadow",
              expiring && "border-destructive/50"
            )}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{account.name}</CardTitle>
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
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(account)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{account.email}</span>
                  </div>
                )}
                {account.username && (
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{account.username}</span>
                  </div>
                )}
                {account.password_encrypted && (
                  <div className="flex items-center text-sm">
                    <Lock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-mono flex-1 truncate">
                      {visiblePasswords.has(account.id) ? account.password_encrypted : "••••••••"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(account.id)}>
                      {visiblePasswords.has(account.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                )}
                {account.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{account.phone}</span>
                  </div>
                )}
                
                {/* Expiration Date Display */}
                {expDate && (
                  <div className={cn(
                    "flex items-center text-sm pt-2 border-t border-border/50",
                    expiring ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="font-medium">
                      Expire le {format(expDate, "dd/MM/yyyy", { locale: fr })}
                    </span>
                    {expiring && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-destructive/10 text-destructive rounded">
                        Bientôt
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun compte enregistré</p>
          <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter votre premier compte</p>
        </div>
      )}
    </div>
  );
}
