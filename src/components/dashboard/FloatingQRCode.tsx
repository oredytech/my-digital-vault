import { useState } from "react";
import { QrCode, X, Minus as MinusIcon, GripHorizontal, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingQRCodeProps {
  onClose: () => void;
}

export function FloatingQRCode({ onClose }: FloatingQRCodeProps) {
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const generate = () => {
    if (!text.trim()) {
      toast.error("Entrez un texte ou une URL");
      return;
    }
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text.trim())}`);
  };

  if (minimized) {
    return (
      <div
        className={cn(
          "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform",
          isMobile ? "top-20 right-3" : "bottom-24 left-auto right-[38rem]"
        )}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <QrCode className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-foreground">QR Code</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden",
        isMobile ? "top-20 left-3 right-3" : "bottom-24 left-auto right-[38rem] w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <QrCode className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-foreground">QR Code</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <MinusIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="URL ou texte..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            className="text-xs h-8 rounded-lg"
          />
          <Button size="sm" className="h-8 px-3 text-xs rounded-lg" onClick={generate}>
            Créer
          </Button>
        </div>

        {qrUrl && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-2 rounded-lg">
              <img src={qrUrl} alt="QR Code" className="w-32 h-32" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => window.open(qrUrl, "_blank")}>
                <ExternalLink className="w-3 h-3" /> Ouvrir
              </Button>
              <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copié !"); }}>
                <Copy className="w-3 h-3" /> Copier
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
