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
import { Plus, Users, Eye, EyeOff, Trash2, Mail, Lock, Phone, Grid3x3, List, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  created_at: string;
}

export function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
    duration_months: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("accounts").insert({
        ...formData,
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
        user_id: user.id,
      });

      if (error) throw error;

      // Trigger reminder creation if duration is set
      if (formData.duration_months) {
        await supabase.rpc('create_account_expiration_reminder');
      }

      toast.success("Compte ajouté avec succès");
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
        duration_months: "",
      });
      setOpen(false);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du compte");
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

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Mes Comptes</h2>
          <p className="text-muted-foreground mt-1">Gérez vos comptes et mots de passe en toute sécurité</p>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-vault">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau compte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un compte</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du compte *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Durée du compte</Label>
                  <Select
                    value={formData.duration_months}
                    onValueChange={(value) => setFormData({ ...formData, duration_months: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">1 semaine</SelectItem>
                      <SelectItem value="1">1 mois</SelectItem>
                      <SelectItem value="3">3 mois</SelectItem>
                      <SelectItem value="6">6 mois</SelectItem>
                      <SelectItem value="12">1 an</SelectItem>
                      <SelectItem value="24">2 ans</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Un rappel sera créé 1 mois avant l'expiration
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">Ajouter</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
        {accounts.map((account) => {
          const expirationDate = account.duration_months 
            ? new Date(new Date(account.created_at).getTime() + account.duration_months * 30 * 24 * 60 * 60 * 1000)
            : null;
          
          return (
            <Card key={account.id} className="hover:shadow-vault transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    {account.hosting_provider && (
                      <p className="text-xs text-muted-foreground mt-1">{account.hosting_provider}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(account.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{account.email}</span>
                  </div>
                )}
                {account.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{account.phone}</span>
                  </div>
                )}
                {account.password_encrypted && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center flex-1 min-w-0">
                      <Lock className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono truncate">
                        {visiblePasswords.has(account.id) ? account.password_encrypted : "••••••••"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility(account.id)}
                      className="flex-shrink-0 ml-2"
                    >
                      {visiblePasswords.has(account.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
                {expirationDate && (
                  <div className="flex items-center text-sm pt-2 border-t">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Expire le {format(expirationDate, "dd MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                )}
                {account.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
                    {account.notes}
                  </p>
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
          <p className="text-sm text-muted-foreground mt-1">Ajoutez vos premiers comptes et mots de passe</p>
        </div>
      )}
    </div>
  );
}
