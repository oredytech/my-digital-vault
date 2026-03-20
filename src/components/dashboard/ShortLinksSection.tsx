import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Link2, Copy, Trash2, BarChart3,
  MousePointerClick, Clock, Shield, Pencil, Eye, EyeOff,
  Calendar, TrendingUp
} from "lucide-react";
import { ShortLinkStats } from "./ShortLinkStats";
import { SocialShareButtons } from "./SocialShareButtons";

interface ShortLink {
  id: string;
  original_url: string;
  slug: string;
  title: string | null;
  is_password_protected: boolean;
  password_hash: string | null;
  expires_at: string | null;
  is_active: boolean;
  click_count: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

function generateSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join("");
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function ShortLinksSection() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [statsLink, setStatsLink] = useState<ShortLink | null>(null);
  const [formData, setFormData] = useState({
    original_url: "",
    title: "",
    slug: "",
    password: "",
    is_password_protected: false,
    expires_at: "",
  });

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("short_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks((data as ShortLink[]) || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des liens courts");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      original_url: "",
      title: "",
      slug: "",
      password: "",
      is_password_protected: false,
      expires_at: "",
    });
    setEditingLink(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidUrl(formData.original_url)) {
      toast.error("URL invalide. Elle doit commencer par http:// ou https://");
      return;
    }

    if (formData.original_url.length > 2048) {
      toast.error("L'URL ne peut pas dépasser 2048 caractères");
      return;
    }

    const slug = formData.slug.trim() || generateSlug();

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      toast.error("Le slug ne peut contenir que des lettres, chiffres, tirets et underscores");
      return;
    }

    if (slug.length > 50) {
      toast.error("Le slug ne peut pas dépasser 50 caractères");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let passwordHash = null;
      if (formData.is_password_protected && formData.password) {
        passwordHash = await hashPassword(formData.password);
      }

      const linkData = {
        original_url: formData.original_url.trim(),
        title: formData.title.trim() || null,
        slug,
        is_password_protected: formData.is_password_protected,
        password_hash: passwordHash,
        expires_at: formData.expires_at || null,
        user_id: user.id,
      };

      if (editingLink) {
        const updateData: Record<string, unknown> = {
          original_url: linkData.original_url,
          title: linkData.title,
          is_password_protected: linkData.is_password_protected,
          expires_at: linkData.expires_at,
        };
        if (passwordHash) updateData.password_hash = passwordHash;

        const { error } = await supabase
          .from("short_links")
          .update(updateData)
          .eq("id", editingLink.id);
        if (error) throw error;
        toast.success("Lien modifié avec succès");
      } else {
        const { error } = await supabase.from("short_links").insert(linkData);
        if (error) {
          if (error.code === "23505") {
            toast.error("Ce slug est déjà utilisé. Choisissez-en un autre.");
            return;
          }
          throw error;
        }
        toast.success("Lien court créé avec succès !");
      }

      resetForm();
      setOpen(false);
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("short_links").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lien supprimé");
      fetchLinks();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleActive = async (link: ShortLink) => {
    try {
      const { error } = await supabase
        .from("short_links")
        .update({ is_active: !link.is_active })
        .eq("id", link.id);
      if (error) throw error;
      toast.success(link.is_active ? "Lien désactivé" : "Lien activé");
      fetchLinks();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const copyToClipboard = (slug: string) => {
    navigator.clipboard.writeText(`${baseUrl}/s/${slug}`);
    toast.success("Lien copié dans le presse-papier !");
  };

  const openEdit = (link: ShortLink) => {
    setEditingLink(link);
    setFormData({
      original_url: link.original_url,
      title: link.title || "",
      slug: link.slug,
      password: "",
      is_password_protected: link.is_password_protected,
      expires_at: link.expires_at ? link.expires_at.split("T")[0] : "",
    });
    setOpen(true);
  };

  const totalClicks = links.reduce((sum, l) => sum + (l.click_count || 0), 0);
  const activeLinks = links.filter(l => l.is_active).length;

  if (statsLink) {
    return <ShortLinkStats link={statsLink} onBack={() => setStatsLink(null)} baseUrl={baseUrl} />;
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Raccourcisseur de liens</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Créez des liens courts avec suivi des clics et QR codes
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="shadow-vault rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau lien court
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLink ? "Modifier le lien" : "Créer un lien court"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="original_url">URL longue *</Label>
                <Input
                  id="original_url"
                  type="url"
                  value={formData.original_url}
                  onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                  placeholder="https://example.com/page-tres-longue"
                  maxLength={2048}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titre (optionnel)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Mon lien important"
                  maxLength={200}
                  className="rounded-xl"
                />
              </div>
              {!editingLink && (
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug personnalisé (optionnel)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{baseUrl}/s/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-généré"
                      maxLength={50}
                      className="rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Laissez vide pour un slug aléatoire</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="expires_at">Date d'expiration (optionnel)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="password_protected" className="cursor-pointer">
                    Protéger par mot de passe
                  </Label>
                </div>
                <Switch
                  id="password_protected"
                  checked={formData.is_password_protected}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_password_protected: checked })}
                />
              </div>
              {formData.is_password_protected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mot de passe du lien"
                    required={formData.is_password_protected}
                    className="rounded-xl"
                  />
                </div>
              )}
              <Button type="submit" className="w-full rounded-xl">
                {editingLink ? "Modifier" : "Créer le lien court"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{links.length}</p>
                <p className="text-xs text-muted-foreground">Liens créés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MousePointerClick className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Clics totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeLinks}</p>
                <p className="text-xs text-muted-foreground">Liens actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links List */}
      <div className="space-y-3">
        {links.map((link) => (
          <Card key={link.id} className={`rounded-xl transition-all ${!link.is_active ? "opacity-60" : "hover:shadow-vault"}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">
                      {link.title || link.slug}
                    </h3>
                    {!link.is_active && <Badge variant="secondary">Inactif</Badge>}
                    {link.is_password_protected && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Protégé
                      </Badge>
                    )}
                    {link.expires_at && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Expire {new Date(link.expires_at).toLocaleDateString("fr-FR")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-primary font-mono bg-primary/5 px-2 py-0.5 rounded">
                      {baseUrl}/s/{link.slug}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(link.slug)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    → {link.original_url}
                  </p>
                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      {link.click_count || 0} clics
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(link.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {link.last_clicked_at && (
                      <span className="hidden sm:flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Dernier : {new Date(link.last_clicked_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <SocialShareButtons url={`${baseUrl}/s/${link.slug}`} title={link.title || link.slug} compact />
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStatsLink(link)}
                    className="rounded-lg"
                    title="Statistiques"
                  >
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(link)}
                    className="rounded-lg"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(link)}
                    className="rounded-lg"
                    title={link.is_active ? "Désactiver" : "Activer"}
                  >
                    {link.is_active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                    className="rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun lien court créé</p>
          <p className="text-sm text-muted-foreground mt-1">
            Créez votre premier lien court pour commencer à suivre vos clics
          </p>
        </div>
      )}
    </div>
  );
}
