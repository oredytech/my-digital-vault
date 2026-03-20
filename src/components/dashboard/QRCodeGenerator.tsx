import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  url: string;
  slug?: string;
  compact?: boolean;
}

type QRStyle = "squares" | "dots" | "rounded";

const PRESET_COLORS = [
  { label: "Noir", fg: "#000000", bg: "#ffffff" },
  { label: "Bleu foncé", fg: "#1e3a5f", bg: "#ffffff" },
  { label: "Vert forêt", fg: "#1a5c2a", bg: "#ffffff" },
  { label: "Bordeaux", fg: "#6b1d2a", bg: "#ffffff" },
  { label: "Marine/Or", fg: "#0c2340", bg: "#f5e6c8" },
  { label: "Violet", fg: "#4a1a6b", bg: "#faf5ff" },
];

export function QRCodeGenerator({ url, slug, compact = false }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [qrStyle, setQrStyle] = useState<QRStyle>("squares");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const drawQR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = compact ? 180 : 280;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      // Generate QR matrix
      const qrData = QRCode.create(url, { errorCorrectionLevel: logoSrc ? "H" : "M" });
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const margin = 2;
      const totalModules = moduleCount + margin * 2;
      const moduleSize = size / totalModules;

      // Clear canvas
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      // Draw modules
      ctx.fillStyle = fgColor;
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col)) {
            const x = (col + margin) * moduleSize;
            const y = (row + margin) * moduleSize;
            const s = moduleSize;

            if (qrStyle === "dots") {
              ctx.beginPath();
              ctx.arc(x + s / 2, y + s / 2, s * 0.42, 0, Math.PI * 2);
              ctx.fill();
            } else if (qrStyle === "rounded") {
              const r = s * 0.3;
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + s - r, y);
              ctx.quadraticCurveTo(x + s, y, x + s, y + r);
              ctx.lineTo(x + s, y + s - r);
              ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
              ctx.lineTo(x + r, y + s);
              ctx.quadraticCurveTo(x, y + s, x, y + s - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.fillRect(x, y, s, s);
            }
          }
        }
      }

      // Draw logo in center
      if (logoSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const logoSize = size * 0.22;
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          const pad = 4;

          // White background behind logo
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
          ctx.fill();

          // Draw logo
          ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        };
        img.src = logoSrc;
      }
    } catch {
      // Fallback: use qrcode library's toCanvas
      await QRCode.toCanvas(canvas, url, {
        width: size,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: "M",
      });
    }
  }, [url, fgColor, bgColor, qrStyle, logoSrc, compact]);

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

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Wait a tick for logo to render
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${slug || "code"}.png`;
      a.click();
      toast.success("QR Code téléchargé");
    }, 100);
  };

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <canvas ref={canvasRef} className="border rounded-xl bg-white" />
        <Button variant="outline" onClick={downloadQR} className="rounded-xl w-full text-sm">
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="border-2 border-border rounded-2xl shadow-sm" />
      </div>

      {/* Color presets */}
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

      {/* Custom colors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fg" className="text-xs">Couleur du code</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="fg"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
            <Input
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="rounded-lg h-8 text-xs font-mono"
              maxLength={7}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bg" className="text-xs">Couleur de fond</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="bg"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
            <Input
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="rounded-lg h-8 text-xs font-mono"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Shape */}
      <div className="space-y-1.5">
        <Label className="text-xs">Forme des modules</Label>
        <Select value={qrStyle} onValueChange={(v) => setQrStyle(v as QRStyle)}>
          <SelectTrigger className="rounded-lg h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="squares">■ Carrés</SelectItem>
            <SelectItem value="dots">● Points</SelectItem>
            <SelectItem value="rounded">▢ Arrondis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <Label className="text-xs">Logo au centre (optionnel)</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1.5" />
            {logoSrc ? "Changer" : "Ajouter un logo"}
          </Button>
          {logoSrc && (
            <Button variant="ghost" size="sm" className="rounded-lg text-xs" onClick={removeLogo}>
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Retirer
            </Button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
        {logoSrc && (
          <div className="flex items-center gap-2 mt-1">
            <img src={logoSrc} alt="Logo" className="w-8 h-8 rounded object-cover border" />
            <span className="text-xs text-muted-foreground">{logoFile?.name}</span>
          </div>
        )}
      </div>

      {/* Download */}
      <Button onClick={downloadQR} className="w-full rounded-xl">
        <Download className="w-4 h-4 mr-2" />
        Télécharger le QR Code
      </Button>
    </div>
  );
}
