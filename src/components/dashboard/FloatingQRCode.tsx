import { useState } from "react";
import { QrCode, X, Minus as MinusIcon, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { QRCodeGenerator } from "./QRCodeGenerator";

interface FloatingQRCodeProps {
  onClose: () => void;
}

export function FloatingQRCode({ onClose }: FloatingQRCodeProps) {
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const [value, setValue] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const generate = () => {
    if (!text.trim()) {
      toast.error("Entrez un texte ou une URL");
      return;
    }
    setValue(text.trim());
  };

  if (minimized) {
    return (
      <div
        className={cn(
          "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl cursor-pointer hover:scale-105 transition-transform",
          isMobile ? "top-20 right-3" : "bottom-24 right-[38rem]"
        )}
        onClick={() => setMinimized(false)}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <QrCode className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">QR Code</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
        isMobile
          ? "top-16 bottom-20 left-2 right-2"
          : "bottom-24 right-[38rem] w-80 max-h-[75vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <QrCode className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">QR Code</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <MinusIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 overflow-y-auto overscroll-contain flex-1">
        <div className="flex gap-2">
          <Input
            placeholder="URL ou texte..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            className="text-xs h-8 rounded-lg"
          />
          <Button size="sm" className="h-8 px-3 text-xs rounded-lg flex-shrink-0" onClick={generate}>
            Créer
          </Button>
        </div>

        {value && <QRCodeGenerator url={value} slug="qr" />}
      </div>
    </div>
  );
}
