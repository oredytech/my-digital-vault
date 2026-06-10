import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, Trash2, File as FileIcon, Search, Lock, FolderOpen } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VaultFile {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder: string | null;
  created_at: string;
}

const formatSize = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export function FilesVaultSection() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("Général");
  const [toDelete, setToDelete] = useState<VaultFile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_files")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setFiles((data as VaultFile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Fichier > 25 MB non supporté");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("vault-files")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("vault_files").insert({
        user_id: user.id,
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        folder,
      });
      if (dbErr) throw dbErr;
      toast.success("Fichier ajouté au coffre");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (f: VaultFile) => {
    const { data, error } = await supabase.storage
      .from("vault-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data) {
      toast.error("Impossible de générer le lien");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = f.name;
    a.click();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await supabase.storage.from("vault-files").remove([toDelete.storage_path]);
    await supabase.from("vault_files").delete().eq("id", toDelete.id);
    toast.success("Fichier supprimé");
    setToDelete(null);
    load();
  };

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const folders = Array.from(new Set(files.map((f) => f.folder || "Général")));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" /> Coffre-fort de fichiers
          </h2>
          <p className="text-sm text-muted-foreground">
            Stockage privé chiffré — accessible uniquement par vous
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Dossier"
            className="w-32"
          />
          <Button asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Envoi..." : "Téléverser"}
              <input type="file" hidden onChange={handleUpload} disabled={uploading} />
            </label>
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {folders.map((f) => (
            <Badge key={f} variant="secondary" className="gap-1">
              <FolderOpen className="w-3 h-3" /> {f} (
              {files.filter((x) => (x.folder || "Général") === f).length})
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Aucun fichier. Téléversez votre premier document.
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((f) => (
            <Card key={f.id} className="p-3 flex items-center gap-3">
              <FileIcon className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.folder} • {formatSize(f.size_bytes)} •{" "}
                  {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDownload(f)}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setToDelete(f)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} sera définitivement supprimé du coffre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
