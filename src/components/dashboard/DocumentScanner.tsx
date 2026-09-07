import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScanLine, Camera, ImagePlus, Trash2, Loader2, Sun, Contrast, RotateCw } from "lucide-react";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

interface Page {
  id: string;
  original: string; // data URL
  processed: string;
  rotation: number;
}

type Mode = "color" | "gray" | "bw";

const MODES: { id: Mode; label: string }[] = [
  { id: "color", label: "Couleur" },
  { id: "gray", label: "Niveaux de gris" },
  { id: "bw", label: "Noir & blanc" },
];

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function processImage(
  src: string,
  mode: Mode,
  brightness: number,
  contrast: number,
  rotation: number
): Promise<string> {
  const img = await loadImage(src);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const swap = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const c = contrast;
  const b = brightness;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], bl = px[i + 2];
    if (mode !== "color") {
      const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
      r = g = bl = lum;
    }
    r = (r - 128) * c + 128 + b;
    g = (g - 128) * c + 128 + b;
    bl = (bl - 128) * c + 128 + b;
    if (mode === "bw") {
      const v = r > 150 ? 255 : 0;
      r = g = bl = v;
    }
    px[i] = Math.max(0, Math.min(255, r));
    px[i + 1] = Math.max(0, Math.min(255, g));
    px[i + 2] = Math.max(0, Math.min(255, bl));
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

interface DocumentScannerProps {
  folder: string;
  onSaved: () => void;
}

export function DocumentScanner({ folder, onSaved }: DocumentScannerProps) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [mode, setMode] = useState<Mode>("gray");
  const [brightness, setBrightness] = useState(8);
  const [contrast, setContrast] = useState(1.25);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const newPages: Page[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const original = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const processed = await processImage(original, mode, brightness, contrast, 0);
        newPages.push({ id: crypto.randomUUID(), original, processed, rotation: 0 });
      }
      setPages((p) => [...p, ...newPages]);
    } catch {
      toast.error("Impossible de lire l'image");
    } finally {
      setBusy(false);
    }
  };

  const reprocessAll = async (m: Mode, br: number, ct: number) => {
    setBusy(true);
    try {
      const updated = await Promise.all(
        pages.map(async (p) => ({
          ...p,
          processed: await processImage(p.original, m, br, ct, p.rotation),
        }))
      );
      setPages(updated);
    } finally {
      setBusy(false);
    }
  };

  const rotatePage = async (id: string) => {
    setBusy(true);
    try {
      setPages(await Promise.all(pages.map(async (p) => {
        if (p.id !== id) return p;
        const rotation = (p.rotation + 90) % 360;
        return { ...p, rotation, processed: await processImage(p.original, mode, brightness, contrast, rotation) };
      })));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPages([]);
    setName("");
  };

  const buildPdf = async () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < pages.length; i++) {
      const img = await loadImage(pages[i].processed);
      const ratio = Math.min(pw / img.width, ph / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      if (i > 0) pdf.addPage();
      pdf.addImage(pages[i].processed, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
    }
    return pdf.output("blob");
  };

  const handleSave = async () => {
    if (pages.length === 0) {
      toast.error("Ajoutez au moins une page");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const blob = await buildPdf();
      const fileName = `${(name.trim() || "Document scanné")}.pdf`;
      const path = `${user.id}/${Date.now()}-${fileName.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("vault-files")
        .upload(path, blob, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("vault_files").insert({
        user_id: user.id,
        name: fileName,
        storage_path: path,
        mime_type: "application/pdf",
        size_bytes: blob.size,
        folder: folder || "Général",
      });
      if (dbErr) throw dbErr;
      toast.success(`Document enregistré (${pages.length} page${pages.length > 1 ? "s" : ""})`);
      reset();
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <ScanLine className="w-4 h-4 mr-2" />
          Scanner
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" /> Scanner un document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => cameraRef.current?.click()} disabled={busy}>
              <Camera className="w-4 h-4 mr-2" /> Photographier
            </Button>
            <Button variant="outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
              <ImagePlus className="w-4 h-4 mr-2" /> Galerie
            </Button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Rendu</Label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/40">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMode(m.id); reprocessAll(m.id, brightness, contrast); }}
                  className={cn(
                    "rounded-lg px-1 py-2 text-[11px] font-medium truncate transition-colors",
                    mode === m.id ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Sun className="w-3 h-3" /> Luminosité</Label>
              <input
                type="range" min={-60} max={60} step={2} value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onMouseUp={() => reprocessAll(mode, brightness, contrast)}
                onTouchEnd={() => reprocessAll(mode, brightness, contrast)}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Contrast className="w-3 h-3" /> Contraste</Label>
              <input
                type="range" min={0.6} max={2} step={0.05} value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                onMouseUp={() => reprocessAll(mode, brightness, contrast)}
                onTouchEnd={() => reprocessAll(mode, brightness, contrast)}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {pages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pages.map((p, i) => (
                <div key={p.id} className="relative rounded-lg overflow-hidden border bg-muted/30">
                  <img src={p.processed} alt={`Page ${i + 1}`} className="w-full h-28 object-cover" />
                  <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1.5 rounded">
                    {i + 1}
                  </span>
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => rotatePage(p.id)}
                      className="p-1 rounded bg-background/80"
                      aria-label="Pivoter"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPages(pages.filter((x) => x.id !== p.id))}
                      className="p-1 rounded bg-background/80"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scan-name" className="text-xs">Nom du document</Label>
            <Input
              id="scan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Facture janvier"
              className="rounded-xl"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || busy || pages.length === 0} className="w-full rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
            Enregistrer en PDF dans le coffre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
