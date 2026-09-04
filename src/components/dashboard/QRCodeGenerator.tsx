import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, Upload, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  url: string;
  slug?: string;
  compact?: boolean;
}

type QRStyle = "squares" | "dots" | "rounded" | "classy";
type EyeStyle = "square" | "rounded" | "circle";

const PRESET_COLORS = [
  { label: "Noir", fg: "#000000", bg: "#ffffff" },
  { label: "Bleu foncé", fg: "#1e3a5f", bg: "#ffffff" },
  { label: "Vert forêt", fg: "#1a5c2a", bg: "#ffffff" },
  { label: "Bordeaux", fg: "#6b1d2a", bg: "#ffffff" },
  { label: "Marine/Or", fg: "#0c2340", bg: "#f5e6c8" },
  { label: "Violet", fg: "#4a1a6b", bg: "#faf5ff" },
  { label: "Cyan", fg: "#0e7490", bg: "#ecfeff" },
];

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function QRCodeGenerator({ url, slug, compact = false }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [eyeColor, setEyeColor] = useState("");
  const [qrStyle, setQrStyle] = useState<QRStyle>("squares");
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>("square");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoScale, setLogoScale] = useState(22);
  const [margin, setMargin] = useState(2);

  const drawQR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = compact ? 180 : 280;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const qrData = QRCode.create(url, { errorCorrectionLevel: logoSrc ? "H" : "M" });
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const totalModules = moduleCount + margin * 2;
      const moduleSize = size / totalModules;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      // finder pattern (eyes) zones: 7x7 at 3 corners
      const inEye = (row: number, col: number) =>
        (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (!modules.get(row, col)) continue;
          const eye = inEye(row, col);
          ctx.fillStyle = eye && eyeColor ? eyeColor : fgColor;
          const x = (col + margin) * moduleSize;
          const y = (row + margin) * moduleSize;
          const s = moduleSize;

          const style: QRStyle | EyeStyle = eye
            ? eyeStyle === "circle" ? "dots" : eyeStyle === "rounded" ? "rounded" : "squares"
            : qrStyle;

          if (style === "dots") {
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s * 0.42, 0, Math.PI * 2);
            ctx.fill();
          } else if (style === "rounded") {
            roundRectPath(ctx, x, y, s, s, s * 0.3);
            ctx.fill();
          } else if (style === "classy") {
            roundRectPath(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.45);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, s, s);
          }
        }
      }

      if (logoSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const logoSize = size * (logoScale / 100);
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          const pad = 4;
          ctx.fillStyle = bgColor;
          roundRectPath(ctx, logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
          ctx.fill();
          ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        };
        img.src = logoSrc;
      }
    } catch {
      await QRCode.toCanvas(canvas, url, {
        width: size,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: "M",
      });
    }
  }, [url, fgColor, bgColor, eyeColor, qrStyle, eyeStyle, logoSrc, logoScale, margin, compact]);

  useEffect(() => {
    drawQR();
  }, [drawQR]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image uniquement");
      return;
    }
    if (file.size > 500_000) {
      toast.error("Image trop lourde (max 500 Ko)");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoSrc(null);
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const downloadQR = (scale = 4) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTimeout(() => {
      const out = document.createElement("canvas");
      out.width = canvas.width * scale;
      out.height = canvas.height * scale;
      const c = out.getContext("2d");
      if (!c) return;
      c.imageSmoothingEnabled = false;
      c.drawImage(canvas, 0, 0, out.width, out.height);
      const a = document.createElement("a");
      a.href = out.toDataURL("image/png");
      a.download = `qr-${slug || "code"}.png`;
      a.click();
      toast.success("QR Code téléchargé (HD)");
    }, 120);
  };

  const copyQR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("QR Code copié");
    } catch {
      toast.error("Copie non supportée sur cet appareil");
    }
  };

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <canvas ref={canvasRef} className="border rounded-xl bg-white max-w-full" />
        <Button variant="outline" onClick={() => downloadQR()} className="rounded-xl w-full text-sm">
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="border-2 border-border rounded-2xl shadow-sm max-w-full h-auto" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Thèmes rapides</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/50 transition-colors text-xs"
              title={p.label}
            >
              <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: p.fg }} />
              <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: p.bg }} />
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fg" className="text-xs">Couleur du code</Label>
          <div className="flex items-center gap-2">
            <input type="color" id="fg" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 flex-shrink-0" />
            <Input value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="rounded-lg h-8 text-xs font-mono" maxLength={7} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bg" className="text-xs">Couleur de fond</Label>
          <div className="flex items-center gap-2">
            <input type="color" id="bg" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 flex-shrink-0" />
            <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="rounded-lg h-8 text-xs font-mono" maxLength={7} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eye" className="text-xs">Couleur des coins</Label>
          <div className="flex items-center gap-2">
            <input type="color" id="eye" value={eyeColor || fgColor} onChange={(e) => setEyeColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 flex-shrink-0" />
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setEyeColor("")}>
              <RotateCcw className="w-3 h-3 mr-1" /> Identique
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Marge ({margin})</Label>
          <Slider value={[margin]} min={0} max={6} step={1} onValueChange={(v) => setMargin(v[0])} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Forme des modules</Label>
          <Select value={qrStyle} onValueChange={(v) => setQrStyle(v as QRStyle)}>
            <SelectTrigger className="rounded-lg h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="squares">■ Carrés</SelectItem>
              <SelectItem value="dots">● Points</SelectItem>
              <SelectItem value="rounded">▢ Arrondis</SelectItem>
              <SelectItem value="classy">◆ Élégant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Forme des coins</Label>
          <Select value={eyeStyle} onValueChange={(v) => setEyeStyle(v as EyeStyle)}>
            <SelectTrigger className="rounded-lg h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="square">■ Carrés</SelectItem>
              <SelectItem value="rounded">▢ Arrondis</SelectItem>
              <SelectItem value="circle">● Cercles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Logo au centre (optionnel)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => logoInputRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1.5" />
            {logoSrc ? "Changer" : "Ajouter un logo"}
          </Button>
          {logoSrc && (
            <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={removeLogo}>
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Retirer
            </Button>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
        {logoSrc && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded object-cover border flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{logoFile?.name}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taille du logo ({logoScale}%)</Label>
              <Slider value={[logoScale]} min={12} max={32} step={1} onValueChange={(v) => setLogoScale(v[0])} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => downloadQR()} className="flex-1 rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          Télécharger (HD)
        </Button>
        <Button variant="outline" onClick={copyQR} className="rounded-xl">
          <Copy className="w-4 h-4 mr-2" />
          Copier l'image
        </Button>
      </div>
    </div>
  );
}
