import { useState } from "react";
import { 
  Command, 
  Mic, 
  MicOff, 
  Sparkles, 
  Zap, 
  Copy, 
  QrCode,
  Share2,
  Timer,
  Calculator,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickActionsWidgetProps {
  onQuickAdd?: (type: string, data: any) => void;
}

export function QuickActionsWidget({ onQuickAdd }: QuickActionsWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [calcResult, setCalcResult] = useState("");
  const [calcInput, setCalcInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#00b4d8");

  // Voice recognition
  const startVoiceRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("La reconnaissance vocale n'est pas supportée");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Erreur de reconnaissance vocale");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      processVoiceCommand(transcript);
    };

    recognition.start();
  };

  const processVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("ajouter lien") || lowerText.includes("nouveau lien")) {
      toast.success("Commande détectée: Ajouter un lien");
      onQuickAdd?.("link", { title: text.replace(/ajouter lien|nouveau lien/gi, "").trim() });
    } else if (lowerText.includes("ajouter idée") || lowerText.includes("nouvelle idée")) {
      toast.success("Commande détectée: Ajouter une idée");
      onQuickAdd?.("idea", { title: text.replace(/ajouter idée|nouvelle idée/gi, "").trim() });
    } else if (lowerText.includes("rappel") || lowerText.includes("reminder")) {
      toast.success("Commande détectée: Créer un rappel");
      onQuickAdd?.("reminder", { title: text.replace(/rappel|reminder/gi, "").trim() });
    } else {
      toast.info(`Texte reconnu: "${text}"`);
    }
  };

  // Pomodoro timer
  const togglePomodoro = () => {
    if (pomodoroActive) {
      setPomodoroActive(false);
      setPomodoroTime(25 * 60);
      toast.info("Pomodoro arrêté");
    } else {
      setPomodoroActive(true);
      toast.success("Pomodoro démarré - 25 minutes");
      
      const interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPomodoroActive(false);
            toast.success("Pomodoro terminé! Prenez une pause.", { duration: 10000 });
            // Play notification sound
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("VaultKeep - Pomodoro", {
                body: "Session terminée! Prenez une pause de 5 minutes.",
                icon: "/logo.webp"
              });
            }
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculator
  const calculateResult = () => {
    try {
      // Safe eval using Function constructor
      const sanitized = calcInput.replace(/[^0-9+\-*/().%]/g, "");
      const result = new Function(`return ${sanitized}`)();
      setCalcResult(String(result));
    } catch {
      setCalcResult("Erreur");
    }
  };

  // Generate QR Code (using a free API)
  const generateQRCode = async (text: string) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("QR Code généré!");
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers!");
  };

  // Share current page
  const shareCurrentPage = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "VaultKeep",
        text: "Découvrez VaultKeep - Votre coffre-fort digital",
        url: window.location.href
      });
    } else {
      await copyToClipboard(window.location.href);
    }
  };

  const presetColors = [
    "#00b4d8", "#00d4aa", "#ff6b6b", "#ffd93d", 
    "#6c5ce7", "#fd79a8", "#74b9ff", "#a29bfe"
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-card rounded-xl border border-border">
      {/* Voice Command */}
      <Button
        variant="outline"
        size="sm"
        onClick={startVoiceRecognition}
        className={cn(
          "gap-2 transition-all",
          isListening && "bg-destructive text-destructive-foreground animate-pulse"
        )}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isListening ? "Écoute..." : "Commande vocale"}
      </Button>

      {/* Pomodoro Timer */}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePomodoro}
        className={cn(
          "gap-2",
          pomodoroActive && "bg-primary text-primary-foreground"
        )}
      >
        <Timer className="w-4 h-4" />
        {pomodoroActive ? formatTime(pomodoroTime) : "Pomodoro"}
      </Button>

      {/* Calculator */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="w-4 h-4" />
            Calculatrice
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Calculatrice rapide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              placeholder="Ex: 15 * 3 + 10"
              onKeyDown={(e) => e.key === "Enter" && calculateResult()}
            />
            <div className="flex gap-2">
              <Button onClick={calculateResult} className="flex-1">Calculer</Button>
              <Button variant="outline" onClick={() => { setCalcInput(""); setCalcResult(""); }}>
                Effacer
              </Button>
            </div>
            {calcResult && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <span className="text-2xl font-bold text-primary">{calcResult}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Generator */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="w-4 h-4" />
            QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Générateur de QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              id="qr-input"
              placeholder="URL ou texte à encoder"
            />
            <Button 
              onClick={() => {
                const input = document.getElementById("qr-input") as HTMLInputElement;
                if (input?.value) generateQRCode(input.value);
              }}
              className="w-full"
            >
              Générer le QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Picker */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            style={{ borderColor: selectedColor }}
          >
            <Palette className="w-4 h-4" style={{ color: selectedColor }} />
            Couleurs
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Palette de couleurs</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  copyToClipboard(color);
                  setShowColorPicker(false);
                }}
                className="w-12 h-12 rounded-lg border-2 border-transparent hover:border-foreground transition-all hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Cliquez pour copier le code couleur
          </p>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Button variant="outline" size="sm" onClick={shareCurrentPage} className="gap-2">
        <Share2 className="w-4 h-4" />
        Partager
      </Button>

      {/* Voice text display */}
      {voiceText && (
        <div className="w-full mt-2 p-2 bg-muted rounded-lg text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>"{voiceText}"</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => copyToClipboard(voiceText)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}